import { AppShell } from "@/components/app-shell";
import { requireUserRole } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function SuperadminPage() {
  await requireUserRole(["superadmin"]);

  return (
    <AppShell title="Authorization Control" eyebrow="Superadmin">
      <section className="max-w-7xl">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">User Management</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            This area is reserved for managing staff users and roles after Supabase Auth is connected.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
