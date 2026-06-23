"use client";

import { deleteSiteAction } from "./actions";

interface DeleteSiteFormProps {
  siteId: string;
}

export function DeleteSiteForm({ siteId }: DeleteSiteFormProps) {
  return (
    <form
      action={deleteSiteAction}
      className="inline"
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Are you absolutely sure you want to completely remove this deployment site?",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="siteId" value={siteId} />
      <button
        type="submit"
        className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline bg-transparent cursor-pointer"
      >
        Remove
      </button>
    </form>
  );
}
