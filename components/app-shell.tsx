import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type AppShellProps = {
  title: string;
  eyebrow: string;
  action?: ReactNode;
  children: ReactNode;
};

const navigationItems = [
  { href: "/staff", label: "Staff" },
  { href: "/superadmin", label: "Superadmin" },
  { href: "/preview", label: "Preview" },
];

export function AppShell({ title, eyebrow, action, children }: AppShellProps) {
  return (
    <main className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-slate-200 bg-white lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col px-5 py-5">
          <Link href="/staff" className="block">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">
              Counter System
            </p>
            <p className="mt-2 text-xl font-black text-slate-950">Menu Control</p>
          </Link>

          <nav className="mt-8 grid gap-2">
            {navigationItems.map((item) => (
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

      <section className="min-w-0">
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

        <div className="px-6 py-6">{children}</div>
      </section>
    </main>
  );
}
