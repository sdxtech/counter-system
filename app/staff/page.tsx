import { AppShell } from "@/components/app-shell";
import type { MenuCardData } from "@/components/menu-card";
import { requireUserRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { AddMenuDialog } from "./add-menu-dialog";
import { MenuCarousel } from "./menu-carousel";
import { ResetMenusDialog } from "./reset-menus-dialog";

export const dynamic = "force-dynamic";

async function getMenuItems(): Promise<MenuCardData[]> {
  const supabase = await createClient();
  const { data: menuItems, error: menuError } = await supabase
    .from("menu_items")
    .select("id, name, note, qty, active_image_id")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (menuError) {
    throw new Error(`Failed to load menu items: ${menuError.message}`);
  }

  const imageIds = (menuItems ?? [])
    .map((item) => item.active_image_id)
    .filter((imageId): imageId is string => Boolean(imageId));
  const imageUrlById = new Map<string, string>();

  if (imageIds.length > 0) {
    const { data: menuImages, error: imageError } = await supabase
      .from("menu_images")
      .select("id, public_url")
      .in("id", imageIds)
      .is("deleted_at", null);

    if (imageError) {
      throw new Error(`Failed to load menu images: ${imageError.message}`);
    }

    for (const image of menuImages ?? []) {
      if (image.public_url) imageUrlById.set(image.id, image.public_url);
    }
  }

  return (menuItems ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    note: item.note,
    qty: item.qty,
    imageUrl: item.active_image_id ? imageUrlById.get(item.active_image_id) : null,
  }));
}

export default async function StaffPage() {
  const { role } = await requireUserRole(["staff", "superadmin"]);
  const menuItems = await getMenuItems();

  return (
    <AppShell
      title="Dashboard"
      eyebrow="Staff"
      role={role}
      showHeader={false}
      showSidebar={false}
    >
      <div className="space-y-6">
        <div className="flex justify-center gap-3">
          <AddMenuDialog />
          <ResetMenusDialog disabled={menuItems.length === 0} />
        </div>

        <MenuCarousel items={menuItems} />
      </div>
    </AppShell>
  );
}
