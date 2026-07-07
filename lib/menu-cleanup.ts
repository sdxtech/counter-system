import { createAdminClient } from "@/lib/supabase/admin";

const MENU_IMAGE_BUCKET = "menu-images";
const MENU_RETENTION_HOURS = 12;

type ExpiredImage = {
  id: string;
  menu_item_id: string;
  storage_path: string;
};

type ExpiredMenu = {
  id: string;
};

export type CleanupExpiredMenusResult = {
  deletedMenus: number;
  deletedMenuImages: number;
  deletedExpiredImages: number;
};

export async function cleanupExpiredMenus(): Promise<CleanupExpiredMenusResult> {
  const supabase = createAdminClient();
  const now = new Date();
  const menuCutoff = new Date(now);
  menuCutoff.setHours(menuCutoff.getHours() - MENU_RETENTION_HOURS);

  const { data: expiredMenuRows, error: menuSelectError } = await supabase
    .from("menu_items")
    .select("id")
    .lte("created_at", menuCutoff.toISOString())
    .limit(100);

  if (menuSelectError) {
    throw new Error(menuSelectError.message);
  }

  const expiredMenus = (expiredMenuRows ?? []) as ExpiredMenu[];
  const expiredMenuIds = expiredMenus.map((menu) => menu.id);
  let deletedMenuImageCount = 0;

  if (expiredMenuIds.length > 0) {
    const { data: menuImageRows, error: menuImageSelectError } = await supabase
      .from("menu_images")
      .select("storage_path")
      .in("menu_item_id", expiredMenuIds);

    if (menuImageSelectError) {
      throw new Error(menuImageSelectError.message);
    }

    const menuImagePaths = (menuImageRows ?? [])
      .map((image) => image.storage_path)
      .filter((path): path is string => Boolean(path));

    if (menuImagePaths.length > 0) {
      const { error: menuImageRemoveError } = await supabase.storage
        .from(MENU_IMAGE_BUCKET)
        .remove(menuImagePaths);

      if (menuImageRemoveError) {
        throw new Error(menuImageRemoveError.message);
      }

      deletedMenuImageCount = menuImagePaths.length;
    }

    const { error: menuDeleteError } = await supabase
      .from("menu_items")
      .delete()
      .in("id", expiredMenuIds);

    if (menuDeleteError) {
      throw new Error(menuDeleteError.message);
    }
  }

  const { data: expiredImageRows, error: imageSelectError } = await supabase
    .from("menu_images")
    .select("id, menu_item_id, storage_path")
    .is("deleted_at", null)
    .lte("expires_at", now.toISOString())
    .limit(100);

  if (imageSelectError) {
    throw new Error(imageSelectError.message);
  }

  const expiredImages = (expiredImageRows ?? []) as ExpiredImage[];

  if (!expiredImages.length) {
    return {
      deletedMenus: expiredMenuIds.length,
      deletedMenuImages: deletedMenuImageCount,
      deletedExpiredImages: 0,
    };
  }

  const paths = expiredImages.map((image) => image.storage_path);
  const imageIds = expiredImages.map((image) => image.id);

  const { error: removeError } = await supabase.storage
    .from(MENU_IMAGE_BUCKET)
    .remove(paths);

  if (removeError) {
    throw new Error(removeError.message);
  }

  const { error: itemUpdateError } = await supabase
    .from("menu_items")
    .update({ active_image_id: null })
    .in("active_image_id", imageIds);

  if (itemUpdateError) {
    throw new Error(itemUpdateError.message);
  }

  const { error: imageUpdateError } = await supabase
    .from("menu_images")
    .update({ deleted_at: now.toISOString(), public_url: null })
    .in("id", imageIds);

  if (imageUpdateError) {
    throw new Error(imageUpdateError.message);
  }

  return {
    deletedMenus: expiredMenuIds.length,
    deletedMenuImages: deletedMenuImageCount,
    deletedExpiredImages: imageIds.length,
  };
}
