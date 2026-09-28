import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireUserRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { KeyMapEditor } from "./key-map-editor";

export const dynamic = "force-dynamic";

export default async function KeyMapPage({ searchParams }: {
  searchParams: Promise<{ site?: string | string[] }>;
}) {
  const { role } = await requireUserRole(["superadmin"]);
  const supabase = await createClient();
  const { data: sites, error: sitesError } = await supabase.from("sites").select("id, name").order("name");
  if (sitesError) throw new Error("Gagal memuat daftar site.");
  const { site } = await searchParams;
  const siteId = typeof site === "string" ? site : sites?.[0]?.id;
  if (siteId && !sites?.some((entry) => entry.id === siteId)) notFound();

  const [menus, keyMap] = siteId ? await Promise.all([
    supabase.from("menu_items").select("id, name, qty").eq("site_id", siteId).eq("is_active", true).order("created_at", { ascending: false }),
    supabase.from("menu_key_bindings").select("menu_item_id, numpad_digit").eq("site_id", siteId),
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  const loadError = menus.error || keyMap.error;
  if (loadError) console.error("Failed to load site key map:", loadError.code, loadError.message);

  return (
    <AppShell title="Key Map" eyebrow="Superadmin" role={role}>
      <KeyMapEditor
        key={siteId ?? "no-site"}
        sites={sites ?? []}
        siteId={siteId ?? ""}
        menus={menus.data ?? []}
        initialBindings={keyMap.data ?? []}
        unavailable={Boolean(loadError)}
      />
    </AppShell>
  );
}
