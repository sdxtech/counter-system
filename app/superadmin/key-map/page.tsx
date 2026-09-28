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

  const keyMap = siteId ? await supabase.from("site_menu_slot_keys")
    .select("menu_position, numpad_digit").eq("site_id", siteId)
    : { data: [], error: null };
  const loadError = keyMap.error;
  if (loadError) console.error("Failed to load site key map:", loadError.code, loadError.message);

  return (
    <AppShell title="Key Map" eyebrow="Superadmin" role={role}>
      <KeyMapEditor
        key={siteId ?? "no-site"}
        sites={sites ?? []}
        siteId={siteId ?? ""}
        initialBindings={keyMap.data ?? []}
        unavailable={Boolean(loadError)}
      />
    </AppShell>
  );
}
