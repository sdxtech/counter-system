import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">
            Counter System
          </p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">Login</h1>
          <p className="mt-2 text-sm text-slate-600">
            Use your staff or superadmin account to manage menu stock.
          </p>
        </div>
        <LoginForm />
        <Link
          href="/preview"
          className="mt-5 block text-center text-sm font-semibold text-[var(--color-primary)]"
        >
          Back to dashboard preview
        </Link>
      </section>
    </main>
  );
}
