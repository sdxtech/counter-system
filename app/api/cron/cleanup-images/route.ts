import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

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

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret && process.env.NODE_ENV !== "production") {
    return true;
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : request.headers.get("x-cron-secret");

  return Boolean(cronSecret && token === cronSecret);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    return NextResponse.json({ error: menuSelectError.message }, { status: 500 });
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
      return NextResponse.json({ error: menuImageSelectError.message }, { status: 500 });
    }

    const menuImagePaths = (menuImageRows ?? [])
      .map((image) => image.storage_path)
      .filter((path): path is string => Boolean(path));

    if (menuImagePaths.length > 0) {
      const { error: menuImageRemoveError } = await supabase.storage
        .from(MENU_IMAGE_BUCKET)
        .remove(menuImagePaths);

      if (menuImageRemoveError) {
        return NextResponse.json({ error: menuImageRemoveError.message }, { status: 500 });
      }

      deletedMenuImageCount = menuImagePaths.length;
    }

    const { error: menuDeleteError } = await supabase
      .from("menu_items")
      .delete()
      .in("id", expiredMenuIds);

    if (menuDeleteError) {
      return NextResponse.json({ error: menuDeleteError.message }, { status: 500 });
    }
  }

  const { data: expiredImageRows, error: selectError } = await supabase
    .from("menu_images")
    .select("id, menu_item_id, storage_path")
    .is("deleted_at", null)
    .lte("expires_at", now.toISOString())
    .limit(100);

  if (selectError) {
    return NextResponse.json({ error: selectError.message }, { status: 500 });
  }

  const expiredImages = (expiredImageRows ?? []) as ExpiredImage[];

  if (!expiredImages?.length) {
    return NextResponse.json({
      deletedMenus: expiredMenuIds.length,
      deletedMenuImages: deletedMenuImageCount,
      deletedExpiredImages: 0,
    });
  }

  const paths = expiredImages.map((image) => image.storage_path);
  const imageIds = expiredImages.map((image) => image.id);

  const { error: removeError } = await supabase.storage
    .from(MENU_IMAGE_BUCKET)
    .remove(paths);

  if (removeError) {
    return NextResponse.json({ error: removeError.message }, { status: 500 });
  }

  const { error: itemUpdateError } = await supabase
    .from("menu_items")
    .update({ active_image_id: null })
    .in("active_image_id", imageIds);

  if (itemUpdateError) {
    return NextResponse.json({ error: itemUpdateError.message }, { status: 500 });
  }

  const { error: imageUpdateError } = await supabase
    .from("menu_images")
    .update({ deleted_at: now.toISOString(), public_url: null })
    .in("id", imageIds);

  if (imageUpdateError) {
    return NextResponse.json({ error: imageUpdateError.message }, { status: 500 });
  }

  return NextResponse.json({
    deletedMenus: expiredMenuIds.length,
    deletedMenuImages: deletedMenuImageCount,
    deletedExpiredImages: imageIds.length,
  });
}
