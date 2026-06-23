import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const MENU_IMAGE_BUCKET = "menu-images";

type ExpiredImage = {
  id: string;
  menu_item_id: string;
  storage_path: string;
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

  const { data: expiredImageRows, error: selectError } = await supabase
    .from("menu_images")
    .select("id, menu_item_id, storage_path")
    .is("deleted_at", null)
    .lte("expires_at", new Date().toISOString())
    .limit(100);

  if (selectError) {
    return NextResponse.json({ error: selectError.message }, { status: 500 });
  }

  const expiredImages = (expiredImageRows ?? []) as ExpiredImage[];

  if (!expiredImages?.length) {
    return NextResponse.json({ deleted: 0 });
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
    .update({ deleted_at: new Date().toISOString(), public_url: null })
    .in("id", imageIds);

  if (imageUpdateError) {
    return NextResponse.json({ error: imageUpdateError.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: imageIds.length });
}
