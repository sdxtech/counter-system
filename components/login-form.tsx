"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import type { AppRole } from "@/lib/supabase/database.types";

function getRedirectPath(role?: AppRole | null) {
  return role === "superadmin" ? "/superadmin" : "/staff";
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      const userId = signInData.user?.id;

      if (!userId) {
        setError("Login succeeded, but user data was not returned.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (profileError) {
        setError(profileError.message);
        return;
      }

      const typedProfile = profile as { role?: AppRole | null } | null;

      router.push(getRedirectPath(typedProfile?.role));
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none ring-[var(--color-primary)] focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none ring-[var(--color-primary)] focus:ring-2"
        />
      </div>
      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
      ) : null}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Signing in..." : "Login"}
      </Button>
    </form>
  );
}
