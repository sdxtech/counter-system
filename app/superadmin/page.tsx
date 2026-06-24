import { AppShell } from "@/components/app-shell";
import { requireUserRole } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function SuperadminPage() {
  // Validate session credentials against database role restrictions
  const { role } = await requireUserRole(["superadmin"]);

  return (
    <AppShell title="Authorization Control" eyebrow="Superadmin" role={role}>
      <section className="max-w-7xl">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Administration Overview</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Use the navigation bar to manage user accounts, roles, operational sites, and deployment settings.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
