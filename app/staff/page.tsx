import { AppShell } from "@/components/app-shell";
import { MenuCard, type MenuCardData } from "@/components/menu-card";
import { Button } from "@/components/ui/button";
import { requireUserRole } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

const previewItems: MenuCardData[] = [
  {
    id: "preview-1",
    name: "Menu Preview",
    note: "Connect Supabase env to load real staff data.",
    qty: 10,
  },
];

export default async function StaffPage() {
  await requireUserRole(["staff", "superadmin"]);

  return (
    <AppShell title="Menu Operations" eyebrow="Staff" action={<Button>+ Add Menu</Button>}>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {previewItems.map((item) => (
          <MenuCard key={item.id} item={item} />
        ))}
      </div>
    </AppShell>
  );
}
