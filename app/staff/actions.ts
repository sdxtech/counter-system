"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUserRole } from "@/lib/auth/guards";
import { getPhotoExpiryDate } from "@/lib/counter";
import { createClient } from "@/lib/supabase/server";
import type { TakeMenuResult } from "@/lib/take-queue";
import { takeMenuStock } from "@/lib/take-menu-stock";

const MENU_IMAGE_BUCKET = "menu-images";
const MAX_ACTIVE_MENU_ITEMS = 6;
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const MAX_DETAILS_CHARACTERS = 100;
const MAX_DETAILS_LINES = 4;
const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const NUTRITION_NOTE_DELIMITER = "\n\n[NUTRITION_FACT]\n";

const menuDetailSchema = (label: string) =>
  z
    .string()
    .trim()
    .max(MAX_DETAILS_CHARACTERS, `${label} maksimal ${MAX_DETAILS_CHARACTERS} karakter.`)
    .refine(
      (value) => value.split(/\r\n|\r|\n/).length <= MAX_DETAILS_LINES,
      `${label} maksimal ${MAX_DETAILS_LINES} baris.`,
    );

const menuSchema = z.object({
  name: z.string().trim().min(1, "Nama menu wajib diisi.").max(25, "Nama menu maksimal 25 karakter."),
  qty: z.coerce.number().int("Qty harus berupa angka bulat.").min(0, "Qty tidak boleh negatif.").max(10000, "Qty maksimal 10.000."),
  description: menuDetailSchema("Description"),
  nutritionFact: menuDetailSchema("Nutrition fact"),
});

export type CreateMenuState = {
  status: "idle" | "success" | "error";
  message: string;
  submissionId: string;
};

export type ResetMenusResult = {
  success: boolean;
  message: string;
};

export type MenuMutationResult = {
  success: boolean;
  message: string;
};

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

function errorState(message: string): CreateMenuState {
  return {
    status: "error",
    message,
    submissionId: crypto.randomUUID(),
  };
}

function getFileExtension(contentType: string) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

function isMissingNutritionFactColumn(error: { message?: string; code?: string } | null) {
  const normalizedMessage = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "42703" ||
    (normalizedMessage.includes("nutrition_fact") &&
      (normalizedMessage.includes("does not exist") || normalizedMessage.includes("schema cache")))
  );
}

function serializeNoteWithNutrition(description: string, nutritionFact: string) {
  return nutritionFact ? `${description}${NUTRITION_NOTE_DELIMITER}${nutritionFact}` : description;
}

export async function createMenuAction(
  _previousState: CreateMenuState,
  formData: FormData,
): Promise<CreateMenuState> {
  const { user, siteId } = await requireUserRole(["staff", "superadmin"]);

  if (!siteId) {
    return errorState("Akun belum memiliki site. Hubungi superadmin.");
  }

  const parsedMenu = menuSchema.safeParse({
    name: formData.get("name"),
    qty: formData.get("qty"),
    description: formData.get("description"),
    nutritionFact: formData.get("nutritionFact"),
  });

  if (!parsedMenu.success) {
    return errorState(parsedMenu.error.issues[0]?.message ?? "Input menu tidak valid.");
  }

  const photo = formData.get("photo");

  if (!(photo instanceof File) || photo.size === 0) {
    return errorState("Photo menu wajib dipilih.");
  }

  if (!ALLOWED_PHOTO_TYPES.has(photo.type)) {
    return errorState("Format photo harus JPG, PNG, atau WebP.");
  }

  if (photo.size > MAX_PHOTO_SIZE) {
    return errorState("Ukuran photo maksimal 5 MB.");
  }

  const supabase = await createClient();
  const { name, qty, description, nutritionFact } = parsedMenu.data;
  const { count: activeMenuCount, error: countError } = await supabase
    .from("menu_items")
    .select("id", { count: "exact", head: true })
    .eq("site_id", siteId)
    .eq("is_active", true);

  if (countError) {
    return errorState(countError.message);
  }

  if ((activeMenuCount ?? 0) >= MAX_ACTIVE_MENU_ITEMS) {
    return errorState(`Menu aktif maksimal ${MAX_ACTIVE_MENU_ITEMS} item.`);
  }

  const menuPayload = {
    name,
    note: description,
    nutrition_fact: nutritionFact,
    qty,
    site_id: siteId,
    created_by: user.id,
    updated_by: user.id,
  };
  const fallbackMenuPayload = {
    name,
    note: serializeNoteWithNutrition(description, nutritionFact),
    qty,
    site_id: siteId,
    created_by: user.id,
    updated_by: user.id,
  };
  let { data: menuItem, error: menuError } = await supabase
    .from("menu_items")
    .insert(menuPayload)
    .select("id")
    .single();

  if (isMissingNutritionFactColumn(menuError)) {
    const fallbackInsert = await supabase
      .from("menu_items")
      .insert(fallbackMenuPayload)
      .select("id")
      .single();

    menuItem = fallbackInsert.data;
    menuError = fallbackInsert.error;
  }

  if (menuError || !menuItem) {
    return errorState(menuError?.message ?? "Menu gagal disimpan.");
  }

  const extension = getFileExtension(photo.type);
  const storagePath = `${siteId}/${user.id}/${menuItem.id}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(MENU_IMAGE_BUCKET)
    .upload(storagePath, await photo.arrayBuffer(), {
      contentType: photo.type,
      upsert: false,
    });

  if (uploadError) {
    await supabase.from("menu_items").delete().eq("id", menuItem.id);
    return errorState(uploadError.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(MENU_IMAGE_BUCKET).getPublicUrl(storagePath);

  const { data: menuImage, error: imageError } = await supabase
    .from("menu_images")
    .insert({
      menu_item_id: menuItem.id,
      storage_path: storagePath,
      public_url: publicUrl,
      uploaded_by: user.id,
      expires_at: getPhotoExpiryDate().toISOString(),
    })
    .select("id")
    .single();

  if (imageError || !menuImage) {
    await Promise.all([
      supabase.storage.from(MENU_IMAGE_BUCKET).remove([storagePath]),
      supabase.from("menu_items").delete().eq("id", menuItem.id),
    ]);
    return errorState(imageError?.message ?? "Data photo gagal disimpan.");
  }

  const { error: updateError } = await supabase
    .from("menu_items")
    .update({ active_image_id: menuImage.id, updated_by: user.id })
    .eq("id", menuItem.id);

  if (updateError) {
    await Promise.all([
      supabase.storage.from(MENU_IMAGE_BUCKET).remove([storagePath]),
      supabase.from("menu_items").delete().eq("id", menuItem.id),
    ]);
    return errorState(updateError.message);
  }

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "create_menu_item",
    entity_type: "menu_item",
    entity_id: menuItem.id,
    metadata: { name, qty, site_id: siteId },
  });

  revalidatePath("/staff");

  return {
    status: "success",
    message: "Menu berhasil disimpan.",
    submissionId: crypto.randomUUID(),
  };
}

export async function resetMenusAction(): Promise<ResetMenusResult> {
  const { user, siteId } = await requireUserRole(["staff", "superadmin"]);

  if (!siteId) {
    return { success: false, message: "Akun belum memiliki site. Hubungi superadmin." };
  }

  const supabase = await createClient();
  const { data: menuItems, error: menuSelectError } = await supabase
    .from("menu_items")
    .select("id")
    .eq("site_id", siteId);

  if (menuSelectError) {
    return { success: false, message: menuSelectError.message };
  }

  const menuIds = (menuItems ?? []).map((item) => item.id);

  if (menuIds.length === 0) {
    return { success: true, message: "Tidak ada menu yang perlu dihapus." };
  }

  const { data: menuImages, error: imageSelectError } = await supabase
    .from("menu_images")
    .select("storage_path")
    .in("menu_item_id", menuIds);

  if (imageSelectError) {
    return { success: false, message: imageSelectError.message };
  }

  const { error: deleteError } = await supabase
    .from("menu_items")
    .delete()
    .in("id", menuIds);

  if (deleteError) {
    return { success: false, message: deleteError.message };
  }

  const storagePaths = (menuImages ?? []).map((image) => image.storage_path);
  const storageResult =
    storagePaths.length > 0
      ? await supabase.storage.from(MENU_IMAGE_BUCKET).remove(storagePaths)
      : { error: null };

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "reset_menu_items",
    entity_type: "menu_item",
    metadata: { deleted_count: menuIds.length, site_id: siteId },
  });

  revalidatePath("/staff");

  return {
    success: true,
    message: storageResult.error
      ? "Semua menu dihapus, tetapi beberapa file photo gagal dibersihkan."
      : "Semua menu berhasil dihapus.",
  };
}

export async function takeMenuItemAction(menuItemId: string): Promise<TakeMenuResult> {
  try {
    await requireUserRole(["staff", "superadmin"]);
  } catch {
    // Return a queue error instead of navigating away with unsaved clicks.
    return { success: false, message: "Sesi atau akses tidak dapat diverifikasi." };
  }
  const parsedMenuItemId = z.string().uuid().safeParse(menuItemId);

  if (!parsedMenuItemId.success) {
    return { success: false, message: "Menu tidak valid." };
  }

  const supabase = await createClient();
  // Avoid refreshing /staff for every click (auth, menu queries and cleanup).
  return takeMenuStock(supabase, parsedMenuItemId.data);
}

export async function editMenuAction(menuItemId: string, formData: FormData): Promise<MenuMutationResult> {
  const { user, siteId } = await requireUserRole(["staff", "superadmin"]);
  const parsedMenuItemId = z.string().uuid().safeParse(menuItemId);

  if (!parsedMenuItemId.success) {
    return { success: false, message: "Menu tidak valid." };
  }

  if (!siteId) {
    return { success: false, message: "Akun belum memiliki site. Hubungi superadmin." };
  }

  const parsedMenu = menuSchema.safeParse({
    name: formData.get("name"),
    qty: formData.get("qty"),
    description: formData.get("description"),
    nutritionFact: formData.get("nutritionFact"),
  });

  if (!parsedMenu.success) {
    return {
      success: false,
      message: parsedMenu.error.issues[0]?.message ?? "Input menu tidak valid.",
    };
  }

  const photo = formData.get("photo");

  if (photo instanceof File && photo.size > 0) {
    if (!ALLOWED_PHOTO_TYPES.has(photo.type)) {
      return { success: false, message: "Format photo harus JPG, PNG, atau WebP." };
    }

    if (photo.size > MAX_PHOTO_SIZE) {
      return { success: false, message: "Ukuran photo maksimal 5 MB." };
    }
  }

  const supabase = await createClient();
  const { data: currentMenu, error: currentMenuError } = await supabase
    .from("menu_items")
    .select("id, name, qty, site_id, active_image_id")
    .eq("id", parsedMenuItemId.data)
    .eq("site_id", siteId)
    .single();

  if (currentMenuError || !currentMenu) {
    return { success: false, message: "Menu tidak ditemukan." };
  }

  const { name, qty, description, nutritionFact } = parsedMenu.data;
  let newImageId: string | null = null;
  let newStoragePath: string | null = null;

  if (photo instanceof File && photo.size > 0) {
    const extension = getFileExtension(photo.type);
    newStoragePath = `${siteId}/${user.id}/${parsedMenuItemId.data}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from(MENU_IMAGE_BUCKET)
      .upload(newStoragePath, await photo.arrayBuffer(), {
        contentType: photo.type,
        upsert: false,
      });

    if (uploadError) {
      return { success: false, message: uploadError.message };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(MENU_IMAGE_BUCKET).getPublicUrl(newStoragePath);

    const { data: menuImage, error: imageError } = await supabase
      .from("menu_images")
      .insert({
        menu_item_id: parsedMenuItemId.data,
        storage_path: newStoragePath,
        public_url: publicUrl,
        uploaded_by: user.id,
        expires_at: getPhotoExpiryDate().toISOString(),
      })
      .select("id")
      .single();

    if (imageError || !menuImage) {
      await supabase.storage.from(MENU_IMAGE_BUCKET).remove([newStoragePath]);
      return { success: false, message: imageError?.message ?? "Data photo gagal disimpan." };
    }

    newImageId = menuImage.id;
  }

  const updatePayload = {
    name,
    note: description,
    nutrition_fact: nutritionFact,
    qty,
    updated_by: user.id,
    ...(newImageId ? { active_image_id: newImageId } : {}),
  };
  const fallbackUpdatePayload = {
    name,
    note: serializeNoteWithNutrition(description, nutritionFact),
    qty,
    updated_by: user.id,
    ...(newImageId ? { active_image_id: newImageId } : {}),
  };
  let { error: updateError } = await supabase
    .from("menu_items")
    .update(updatePayload)
    .eq("id", parsedMenuItemId.data)
    .eq("site_id", siteId);

  if (isMissingNutritionFactColumn(updateError)) {
    const fallbackUpdate = await supabase
      .from("menu_items")
      .update(fallbackUpdatePayload)
      .eq("id", parsedMenuItemId.data)
      .eq("site_id", siteId);

    updateError = fallbackUpdate.error;
  }

  if (updateError) {
    if (newImageId) {
      await supabase.from("menu_images").delete().eq("id", newImageId);
    }

    if (newStoragePath) {
      await supabase.storage.from(MENU_IMAGE_BUCKET).remove([newStoragePath]);
    }

    return { success: false, message: updateError.message };
  }

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "edit_menu_item",
    entity_type: "menu_item",
    entity_id: parsedMenuItemId.data,
    metadata: {
      previous_name: currentMenu.name,
      previous_qty: currentMenu.qty,
      next_name: name,
      next_qty: qty,
      site_id: siteId,
      photo_updated: Boolean(newImageId),
    },
  });

  revalidatePath("/staff");
  return { success: true, message: "Menu berhasil diperbarui." };
}

export async function deleteMenuItemAction(menuItemId: string): Promise<MenuMutationResult> {
  const { user, siteId } = await requireUserRole(["staff", "superadmin"]);
  const parsedMenuItemId = z.string().uuid().safeParse(menuItemId);

  if (!parsedMenuItemId.success) {
    return { success: false, message: "Menu tidak valid." };
  }

  if (!siteId) {
    return { success: false, message: "Akun belum memiliki site. Hubungi superadmin." };
  }

  const supabase = await createClient();
  const { data: menuItem, error: menuError } = await supabase
    .from("menu_items")
    .select("id, name, site_id")
    .eq("id", parsedMenuItemId.data)
    .eq("site_id", siteId)
    .single();

  if (menuError || !menuItem) {
    return { success: false, message: "Menu tidak ditemukan." };
  }

  const { data: menuImages, error: imageSelectError } = await supabase
    .from("menu_images")
    .select("storage_path")
    .eq("menu_item_id", parsedMenuItemId.data);

  if (imageSelectError) {
    return { success: false, message: imageSelectError.message };
  }

  const { error: deleteError } = await supabase
    .from("menu_items")
    .delete()
    .eq("id", parsedMenuItemId.data)
    .eq("site_id", siteId);

  if (deleteError) {
    return { success: false, message: deleteError.message };
  }

  const storagePaths = (menuImages ?? []).map((image) => image.storage_path);
  const storageResult =
    storagePaths.length > 0
      ? await supabase.storage.from(MENU_IMAGE_BUCKET).remove(storagePaths)
      : { error: null };

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "delete_menu_item",
    entity_type: "menu_item",
    entity_id: parsedMenuItemId.data,
    metadata: { name: menuItem.name, site_id: siteId },
  });

  revalidatePath("/staff");
  return {
    success: true,
    message: storageResult.error
      ? "Menu dihapus, tetapi beberapa file photo gagal dibersihkan."
      : "Menu berhasil dihapus.",
  };
}
