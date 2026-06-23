// app/superadmin/users/delete-button.tsx
"use client";

import { useTransition } from "react";
import { deleteUserAction, updateUserRoleAction } from "./actions";

interface UserActionsProps {
  userId: string;
  currentRole: string;
  currentSiteId: string;
  sites: Array<{ id: string; name: string }>;
}

export function UserActions({ userId, currentRole, currentSiteId, sites }: UserActionsProps) {
  const [isPending, startTransition] = useTransition();

  // Handle immediate dropdown role adjustments
  const handleRoleChange = (newRole: string) => {
    startTransition(async () => {
      await updateUserRoleAction(userId, newRole);
    });
  };

  return (
    <div className="flex items-center justify-end gap-4">
      {/* Inline Role Selector Dropdown */}
      <select
        value={currentRole}
        disabled={isPending}
        onChange={(e) => handleRoleChange(e.target.value)}
        className="px-2 py-1 border border-slate-200 rounded-md text-xs bg-white focus:outline-hidden focus:border-blue-600 disabled:opacity-60 text-slate-900"
      >
        <option value="staff">Staff</option>
        <option value="superadmin">Superadmin</option>
      </select>

      {/* Inline Delete Trigger */}
      <form
        onSubmit={(e) => {
          if (!confirm("Are you absolute certain you want to remove this user account?")) {
            e.preventDefault();
          }
        }}
        action={deleteUserAction}
      >
        <input type="hidden" name="userId" value={userId} />
        <button
          type="submit"
          disabled={isPending}
          className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline bg-transparent cursor-pointer disabled:opacity-40"
        >
          {isPending ? "..." : "Delete"}
        </button>
      </form>
    </div>
  );
}