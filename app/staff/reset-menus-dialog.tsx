"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { resetMenusAction } from "./actions";

type ResetMenusDialogProps = {
  disabled?: boolean;
};

export function ResetMenusDialog({ disabled = false }: ResetMenusDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function closeDialog() {
    if (isPending) return;
    setErrorMessage("");
    setIsOpen(false);
  }

  function handleReset() {
    setErrorMessage("");

    startTransition(async () => {
      const result = await resetMenusAction();

      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }

      setIsOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant="danger"
        disabled={disabled}
        onClick={() => {
          setErrorMessage("");
          setIsOpen(true);
        }}
      >
        Reset
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
            aria-labelledby="reset-menu-title"
            aria-describedby="reset-menu-description"
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v4m0 4h.01M10.3 4.3 2.6 18a1.5 1.5 0 0 0 1.3 2.2h16.2a1.5 1.5 0 0 0 1.3-2.2L13.7 4.3a2 2 0 0 0-3.4 0Z" />
              </svg>
            </div>

            <h2 id="reset-menu-title" className="mt-4 text-xl font-black text-slate-950">
              Reset semua menu?
            </h2>
            <p id="reset-menu-description" className="mt-2 text-sm leading-6 text-slate-600">
              Apakah Anda yakin ingin melakukan reset? Tindakan ini akan menghapus semua menu dan photo secara permanen.
            </p>

            {errorMessage ? (
              <p role="alert" className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {errorMessage}
              </p>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={closeDialog} disabled={isPending}>
                Cancel
              </Button>
              <Button type="button" variant="danger" onClick={handleReset} disabled={isPending}>
                {isPending ? "Resetting..." : "Yes, Reset All"}
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
