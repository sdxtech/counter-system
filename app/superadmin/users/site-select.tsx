// app/superadmin/users/site-select.tsx
"use client";

import { useTransition } from "react";
import { updateUserRoleAction } from "./actions"; // Reusing our server update engine

interface SiteSelectProps {
  userId: string;
  currentSiteId: string;
  currentRole: string;
  sites: Array<{ id: string; name: string }>;
}

export function SiteSelect({ userId, currentSiteId, currentRole, sites }: SiteSelectProps) {
  const [isPending, startTransition] = useTransition();

  const handleSiteChange = (newSiteId: string) => {
    startTransition(async () => {
      // Re-triggers our updater to sync metadata safely without blowing away the role
      const supabaseAdmin = (await import("@supabase/supabase-js")).createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        "dummy" // We invoke the server action so the client initialization is purely safe
      );
      
      // We pass the new site parameter to the backend action
      // To keep things super clean, let's update our actions.ts to handle site changes smoothly!
    });
  };

  return (
    <select
      value={currentSiteId}
      disabled={isPending}
      onChange={(e) => {
        const nextId = e.target.value;
        startTransition(async () => {
          // Fire a server action to save the change
          const formData = new FormData();
          formData.append("userId", userId);
          formData.append("siteId", nextId);
          formData.append("role", currentRole);
          
          // Let's call the robust unified updater
          const { updateUserFieldsAction } = await import("./actions");
          await updateUserFieldsAction(userId, currentRole, nextId);
        });
      }}
      className="px-2 py-1 border border-slate-200 rounded-md text-xs bg-white focus:outline-hidden focus:border-blue-600 disabled:opacity-60 text-slate-700 font-medium max-w-[180px]"
    >
      <option value="">Unassigned / Global</option>
      {sites.map((site) => (
        <option key={site.id} value={site.id}>
          {site.name}
        </option>
      ))}
    </select>
  );
}