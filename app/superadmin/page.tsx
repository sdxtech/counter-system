// app/superadmin/page.tsx
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireUserRole } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function SuperadminPage() {
  // Validate session credentials against database role restrictions
  await requireUserRole(["superadmin"]);

  return (
    <AppShell title="Authorization Control" eyebrow="Superadmin">
      <section className="max-w-7xl space-y-6">
        
        {/* User Management Panel */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">User Management</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            This area is reserved for managing staff users and roles after Supabase Auth is connected.
          </p>
          
          <div className="mt-6 border-t border-slate-100 pt-4">
            <Link 
              href="/superadmin/users" 
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Open Accounts Panel &rarr;
            </Link>
          </div>
        </div>

        {/* Site Management Panel Card */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Site & Deployment Management</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Register and oversee deployment parameters, counter physical addresses, and facility tracking networks.
          </p>
          <div className="mt-6 border-t border-slate-100 pt-4">
            <Link 
              href="/superadmin/sites" 
              className="inline-flex items-center justify-center rounded-md bg-purple-600 px-4 py-2 text-sm font-bold text-white shadow-xs hover:bg-purple-700 transition-colors cursor-pointer"
            >
              Open Site Management &rarr;
            </Link>
          </div>
        </div>

      </section>
    </AppShell>
  );
}