"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { logoutAction } from "./actions";

type LogoutDialogProps = {
  triggerClassName?: string;
  disabled?: boolean;
};

export function LogoutDialog({ triggerClassName = "", disabled = false }: LogoutDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  function closeDialog() {
    setIsOpen(false);
  }

  return (
    <>
      <Button type="button" variant="ghost" className={triggerClassName} disabled={disabled} onClick={() => setIsOpen(true)}>
        Logout
      </Button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-xs"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            aria-describedby="logout-description"
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-left shadow-2xl"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-700">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
                <path d="M21 19V5a2 2 0 0 0-2-2h-6" />
              </svg>
            </div>

            <h2 id="logout-title" className="mt-4 text-xl font-black text-slate-950">
              Logout sekarang?
            </h2>
            <p id="logout-description" className="mt-2 text-sm leading-6 text-slate-600">
              Anda akan keluar dari dashboard dan kembali ke halaman login.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={closeDialog}>
                Cancel
              </Button>
              <form action={logoutAction}>
                <Button type="submit" variant="danger" disabled={disabled}>
                  Yes, Logout
                </Button>
              </form>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
