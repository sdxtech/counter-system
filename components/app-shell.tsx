import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { AppRole } from "@/lib/supabase/database.types";

type NavigationRole = AppRole | "preview";

type AppShellProps = {
  title: string;
  eyebrow: string;
  role: NavigationRole;
  showHeader?: boolean;
  showSidebar?: boolean;
  action?: ReactNode;
  children: ReactNode;
};

const navigationItems: Record<NavigationRole, { href: string; label: string }[]> = {
  staff: [{ href: "/staff", label: "Dashboard" }],
  superadmin: [
    { href: "/superadmin", label: "Dashboard" },
    { href: "/superadmin/users", label: "User Management" },
    {
      href: "/superadmin/sites",
      label: "Site & Deployment Management",
    },
  ],
  preview: [{ href: "/preview", label: "Dashboard" }],
};

export function AppShell({
  title,
  eyebrow,
  role,
  showHeader = true,
  showSidebar = true,
  action,
  children,
}: AppShellProps) {
  const roleNavigationItems = navigationItems[role];

  return (
    <main
      className={`min-h-screen bg-slate-50 ${
        showSidebar ? "lg:grid lg:grid-cols-[260px_1fr]" : ""
      }`}
    >
      {showSidebar ? (
        <aside className="border-b border-slate-200 bg-white lg:min-h-screen lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col px-5 py-5">
            <Link href={roleNavigationItems[0].href} className="block">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">
                Counter System
              </p>
              <p className="mt-2 text-xl font-black text-slate-950">Menu Control</p>
            </Link>

            <nav className="mt-8 grid gap-2">
              {roleNavigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-[var(--color-primary)]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-auto pt-8">
              <Link href="/login">
                <Button variant="ghost" className="w-full">
                  Switch User
                </Button>
              </Link>
            </div>
          </div>
        </aside>
      ) : null}

      <section className="min-w-0">
        {showHeader ? (
          <div className="border-b border-slate-200 bg-white px-6 py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">
                  {eyebrow}
                </p>
                <h1 className="mt-1 text-2xl font-black text-slate-950">{title}</h1>
              </div>
              {action ? <div className="flex gap-3">{action}</div> : null}
            </div>
          </div>
        ) : null}

        <div className="px-6 py-6">{children}</div>
      </section>
    </main>
  );
}
