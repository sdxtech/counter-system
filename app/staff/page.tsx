import { AppShell } from "@/components/app-shell";
import type { MenuCardData } from "@/components/menu-card";
import { requireUserRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { StaffMenuDashboard } from "./staff-menu-dashboard";

export const dynamic = "force-dynamic";
const NUTRITION_NOTE_DELIMITER = "\n\n[NUTRITION_FACT]\n";

type MenuItemRow = {
  id: string;
  name: string;
  note: string;
  nutrition_fact?: string;
  qty: number;
  active_image_id: string | null;
};

function isMissingNutritionFactColumn(message: string) {
  const normalizedMessage = message.toLowerCase();
  return (
    normalizedMessage.includes("nutrition_fact") &&
    (normalizedMessage.includes("does not exist") || normalizedMessage.includes("schema cache"))
  );
}

function splitNoteAndNutrition(note: string) {
  const delimiterIndex = note.indexOf(NUTRITION_NOTE_DELIMITER);

  if (delimiterIndex === -1) {
    return { description: note, nutritionFact: "" };
  }

  return {
    description: note.slice(0, delimiterIndex),
    nutritionFact: note.slice(delimiterIndex + NUTRITION_NOTE_DELIMITER.length),
  };
}

async function getMenuItems(siteId: string | null): Promise<MenuCardData[]> {
  if (!siteId) return [];

  const supabase = await createClient();
  const menuResult = await supabase
    .from("menu_items")
    .select("id, name, note, nutrition_fact, qty, active_image_id")
    .eq("is_active", true)
    .eq("site_id", siteId)
    .order("created_at", { ascending: false });
  let menuItems = menuResult.data as MenuItemRow[] | null;
  let menuError = menuResult.error;
  let hasNutritionFactColumn = true;

  if (menuError && isMissingNutritionFactColumn(menuError.message)) {
    const fallbackResult = await supabase
      .from("menu_items")
      .select("id, name, note, qty, active_image_id")
      .eq("is_active", true)
      .eq("site_id", siteId)
      .order("created_at", { ascending: false });

    menuItems = fallbackResult.data as MenuItemRow[] | null;
    menuError = fallbackResult.error;
    hasNutritionFactColumn = false;
  }

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

  return (menuItems ?? []).map((item) => {
    const fallbackDetails = splitNoteAndNutrition(item.note);

    return {
      id: item.id,
      name: item.name,
      note: fallbackDetails.description,
      nutritionFact: hasNutritionFactColumn ? (item.nutrition_fact || fallbackDetails.nutritionFact) : fallbackDetails.nutritionFact,
      qty: item.qty,
      imageUrl: item.active_image_id ? imageUrlById.get(item.active_image_id) : null,
    };
  });
}

export default async function StaffPage() {
  const { role, siteId } = await requireUserRole(["staff", "superadmin"]);
  const menuItems = await getMenuItems(siteId);

  return (
    <AppShell
      title="Dashboard"
      eyebrow="Staff"
      role={role}
      showHeader={false}
      showSidebar={false}
    >
      <StaffMenuDashboard items={menuItems} />
    </AppShell>
  );
}
