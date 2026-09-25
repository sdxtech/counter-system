import { AppShell } from "@/components/app-shell";
import { MenuCard, type MenuCardData } from "@/components/menu-card";
import { Button } from "@/components/ui/button";

const sampleMenuItems: MenuCardData[] = [
  {
    id: "sample-1",
    name: "Meal A Western",
    note: "Chicken, potato, mushroom sauce",
    nutritionFact: "Energy : 308.1 kcal\nProtein : 10 gr",
    qty: 62,
  },
  {
    id: "sample-2",
    name: "Meal B Indonesian",
    note: "Rendang, rice, sambal",
    nutritionFact: "Energy : 420 kcal\nProtein : 18 gr",
    qty: 18,
  },
  {
    id: "sample-3",
    name: "Meal C Vegetarian",
    note: "Contains peanuts",
    nutritionFact: "Energy : 250 kcal\nProtein : 7 gr",
    qty: 0,
  },
];

export function DashboardPreview() {
  return (
    <AppShell
      title="Dashboard Counter Menu"
      eyebrow="Preview"
      role="preview"
      action={<Button>+ Add Menu</Button>}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-5 rounded-xl bg-[linear-gradient(135deg,#0f0f23,#1a1a2e,#16213e)] p-5 md:grid-cols-2 xl:grid-cols-3">
          {sampleMenuItems.map((item) => (
            <MenuCard key={item.id} item={item} />
          ))}
        </div>

        <aside className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-950">Build Status</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <p>Next.js app scaffold sudah siap.</p>
            <p>Supabase schema, role, storage bucket, dan cleanup cron sudah disiapkan.</p>
            <p>Isi `.env.local`, jalankan SQL schema, lalu UI bisa disambungkan ke data asli.</p>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
