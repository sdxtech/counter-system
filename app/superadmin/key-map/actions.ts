"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUserRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { MAX_MENU_POSITIONS } from "@/lib/menu-keymap";

const keyMapSchema = z.object({
  siteId: z.string().trim().min(1).max(200),
  bindings: z.array(z.object({
    menu_position: z.number().int().min(1).max(MAX_MENU_POSITIONS),
    numpad_digit: z.number().int().min(0).max(9),
  })).max(MAX_MENU_POSITIONS),
});

export async function saveKeyMapAction(input: unknown) {
  await requireUserRole(["superadmin"]);
  const parsed = keyMapSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Pilih site, menu, dan tombol angka yang valid." };
  const { siteId, bindings } = parsed.data;
  if (new Set(bindings.map((binding) => binding.numpad_digit)).size !== bindings.length ||
      new Set(bindings.map((binding) => binding.menu_position)).size !== bindings.length) {
    return { success: false, message: "Satu tombol angka hanya boleh dipakai oleh satu posisi menu dalam site ini." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_site_menu_slot_keymap", { p_site_id: siteId, p_bindings: bindings });
  if (error) {
    console.error("Failed to save site key map:", error.code, error.message);
    return { success: false, message: error.code === "22023"
      ? "Site atau nomor posisi menu tidak valid. Muat ulang halaman sebelum menyimpan lagi."
      : "Key map belum tersimpan. Coba lagi; pengaturan sebelumnya tetap berlaku." };
  }
  revalidatePath("/superadmin/key-map");
  revalidatePath("/staff");
  return { success: true, message: "Key map tersimpan. Muat ulang dashboard staff untuk memakai pengaturan terbaru." };
}
