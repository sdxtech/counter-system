import { AppShell } from "@/components/app-shell";
import { requireUserRole } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const { role } = await requireUserRole(["staff", "superadmin"]);

  return (
    <AppShell title="Dashboard" eyebrow="Staff" role={role}>
      {null}
    </AppShell>
  );
}
