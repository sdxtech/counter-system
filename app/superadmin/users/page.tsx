import { AppShell } from "@/components/app-shell";
import { requireUserRole } from "@/lib/auth/guards";
import { getUsersAction } from "./actions";
import { getSitesAction } from "../sites/actions";
import { UserActions } from "./delete-button"; 
import { CreateUserForm } from "./create-form"; 
import { SiteSelect } from "./site-select"; 

export const dynamic = "force-dynamic";

export default async function UserManagementPage() {
  await requireUserRole(["superadmin"]);
  const [users, sites] = await Promise.all([
    getUsersAction(),
    getSitesAction(),
  ]);

  return (
    <AppShell title="Account Management" eyebrow="Superadmin">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Dashboard Actions Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Active System Users</h2>
            <p className="text-sm text-slate-500 mt-1">
              Currently monitoring <span className="font-bold text-slate-800">{users.length}</span> active personnel profiles deployed across active operation zones.
            </p>
          </div>
          
          {/* Elegant Pop-up Trigger Element housed cleanly inside top bar */}
          <CreateUserForm sites={sites} />
        </div>

        {/* Full-Width Spacious Data Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4 pl-6">Personnel Email Address</th>
                  <th className="p-4">Assigned Location (Editable)</th>
                  <th className="p-4 pr-6 text-right">Access Role Management Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-slate-400 italic">
                      No active system personnel records found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const userRole = user.user_metadata?.role || 'staff';
                    const userSiteId = user.user_metadata?.siteId || '';

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/40 transition-colors group">
                        <td className="p-4 pl-6 font-semibold text-slate-900">
                          {user.email}
                        </td>
                        
                        {/* Inline Site Picker Cell linked to live DB entries */}
                        <td className="p-4">
                          <SiteSelect 
                            userId={user.id} 
                            currentSiteId={userSiteId} 
                            currentRole={userRole} 
                            sites={sites} 
                          />
                        </td>

                        <td className="p-4 pr-6 text-right">
                          <UserActions 
                            userId={user.id} 
                            currentRole={userRole} 
                            currentSiteId={userSiteId}
                            sites={sites}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
