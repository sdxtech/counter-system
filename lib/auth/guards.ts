import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/supabase/database.types";

type ProfileRole = {
  role?: AppRole | null;
};

export async function requireUserRole(allowedRoles: AppRole[]) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    redirect("/login");
  }

  const typedProfile = profile as ProfileRole;
  const role = typedProfile.role;

  if (!role || !allowedRoles.includes(role)) {
    redirect(role === "staff" ? "/staff" : "/login");
  }

  return { user, role };
}
