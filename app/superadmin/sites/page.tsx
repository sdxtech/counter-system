// app/superadmin/sites/page.tsx
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireUserRole } from "@/lib/auth/guards";
import { getSitesAction, deleteSiteAction, seedExampleSitesDev } from "./actions";
import { CreateSiteForm } from "./create-site-form"; // Import the modal tool

export const dynamic = "force-dynamic";

export default async function SiteManagementPage() {
  await requireUserRole(["superadmin"]);
  
  // Keep your server data flow intact
  await seedExampleSitesDev();
  const sites = await getSitesAction();

  return (
    <AppShell title="Site Management" eyebrow="Superadmin">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Breadcrumb Back Navigation */}
        <div>
          <Link href="/superadmin" className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
            &larr; Back to Authorization Control
          </Link>
        </div>

        {/* Action Top Bar Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Active Operational Sites</h2>
            <p className="text-sm text-slate-500 mt-1">
              Oversee deployment locations. Currently managing <span className="font-bold text-slate-800">{sites.length}</span> active site facilities.
            </p>
          </div>
          
          {/* Beautiful Modal Trigger Component */}
          <CreateSiteForm />
        </div>

        {/* Clean, Full-Width Spacious Data Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4 pl-6">Unique Site Identification Hash</th>
                  <th className="p-4">Operational Location Name / Code</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sites.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-slate-400 italic">
                      No operational sites have been registered to this network profile yet.
                    </td>
                  </tr>
                ) : (
                  sites.map((site) => (
                    <tr key={site.id} className="hover:bg-slate-50/40 transition-colors group">
                      {/* Monospaced ID Hash */}
                      <td className="p-4 pl-6 font-mono text-xs text-slate-400 select-all">
                        {site.id}
                      </td>
                      
                      {/* Location Name Column */}
                      <td className="p-4 font-semibold text-slate-900">
                        {site.name}
                      </td>
                      
                      {/* Danger Wipe Action */}
                      <td className="p-4 pr-6 text-right">
                        <form action={deleteSiteAction} className="inline">
                          <input type="hidden" name="siteId" value={site.id} />
                          <button 
                            type="submit"
                            onClick={(e) => { if(!confirm("Are you absolutely sure you want to completely remove this deployment site?")) e.preventDefault(); }}
                            className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline bg-transparent cursor-pointer"
                          >
                            Remove
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AppShell>
  );
}