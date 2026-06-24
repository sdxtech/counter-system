"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUserRole } from "@/lib/auth/guards";
import { getPhotoExpiryDate } from "@/lib/counter";
import { createClient } from "@/lib/supabase/server";

const MENU_IMAGE_BUCKET = "menu-images";
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const menuSchema = z.object({
  name: z.string().trim().min(1, "Nama menu wajib diisi.").max(100, "Nama menu maksimal 100 karakter."),
  qty: z.coerce.number().int("Qty harus berupa angka bulat.").min(0, "Qty tidak boleh negatif.").max(10000, "Qty maksimal 10.000."),
  description: z.string().trim().max(500, "Description maksimal 500 karakter."),
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

export type TakeMenuResult = {
  success: boolean;
  message: string;
};

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
  const { name, qty, description } = parsedMenu.data;
  const { data: menuItem, error: menuError } = await supabase
    .from("menu_items")
    .insert({
      name,
      note: description,
      qty,
      site_id: siteId,
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id")
    .single();

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
  await requireUserRole(["staff", "superadmin"]);
  const parsedMenuItemId = z.string().uuid().safeParse(menuItemId);

  if (!parsedMenuItemId.success) {
    return { success: false, message: "Menu tidak valid." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("take_menu_item", {
    p_menu_item_id: parsedMenuItemId.data,
  });

  if (error) {
    return {
      success: false,
      message: error.message.includes("qty cannot go below zero")
        ? "Qty menu sudah habis."
        : error.message,
    };
  }

  revalidatePath("/staff");
  return { success: true, message: "Qty berhasil dikurangi." };
}

// Add this to the bottom of app/staff/actions.ts

export type EditMenuState = {
  status: "idle" | "success" | "error";
  message: string;
  submissionId: string;
};

export async function editMenuAction(
  menuItemId: string,
  formData: FormData
): Promise<EditMenuState> {
  try {
    const supabase = await createClient();

    const name = formData.get("name") as string;
    const qty = parseInt(formData.get("qty") as string, 10);
    const note = formData.get("description") as string;
    const photoFile = formData.get("photo") as File | null;

    if (!name || isNaN(qty)) {
      return { status: "error", message: "Nama Menu dan Qty wajib diisi.", submissionId: String(Date.now()) };
    }

    let activeImageId: string | null = null;

    // Check if a brand new image file was picked to overwrite the old one
    if (photoFile && photoFile.size > 0 && photoFile.name !== "undefined") {
      const fileExt = photoFile.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `menu-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("menus")
        .upload(filePath, photoFile, { cacheControl: "3600", upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("menus").getPublicUrl(filePath);

      const { data: imageData, error: imageInsertError } = await supabase
        .from("menu_images")
        .insert({ public_url: publicUrl, storage_path: filePath } as any)
        .select("id")
        .single();

      if (imageInsertError) throw imageInsertError;
      activeImageId = imageData.id;
    }

    // Prepare the record patch updates
    const updateData: Record<string, any> = {
      name,
      qty,
      note,
    };

    if (activeImageId) {
      updateData.active_image_id = activeImageId;
    }

    const { error: updateError } = await supabase
      .from("menu_items")
      .update(updateData as any)
      .eq("id", menuItemId);

    if (updateError) throw updateError;

    return { status: "success", message: "Menu updated successfully!", submissionId: String(Date.now()) };
  } catch (error: any) {
    return {
      status: "error",
      message: error.message || "Gagal mengubah data menu.",
      submissionId: String(Date.now()),
    };
  }
}