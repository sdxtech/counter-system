// app/staff/edit-menu-dialog.tsx
"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { editMenuAction, type EditMenuState } from "./actions";
import type { MenuCardData } from "@/components/menu-card";

const initialEditMenuState: EditMenuState = {
  status: "idle",
  message: "",
  submissionId: "",
};

type EditMenuDialogProps = {
  item: MenuCardData | null;
  isOpen: boolean;
  onClose: () => void;
};

export function EditMenuDialog({ item, isOpen, onClose }: EditMenuDialogProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  // Reset local form states whenever the selected item target changes
  useEffect(() => {
    if (item) {
      setPreviewUrl(item.imageUrl || null);
      setErrorMessage("");
    }
  }, [item]);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!item || !isOpen) return null;

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPreviewUrl((currentUrl) => {
      if (currentUrl && currentUrl.startsWith("blob:")) URL.revokeObjectURL(currentUrl);
      return file ? URL.createObjectURL(file) : item?.imageUrl || null;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  
  // 1. Double check that item is fully defined here to satisfy TypeScript
  if (!item) return; 

  setErrorMessage("");
  const formData = new FormData(event.currentTarget);

  startTransition(async () => {
    // 2. TypeScript now knows for a fact that item exists!
    const result = await editMenuAction(item.id, formData);

    if (result.status === "error") {
      setErrorMessage(result.message);
      return;
    }

    onClose();
    router.refresh();
  });
}

  return (
    <div
      className="fixed inset-0 z-55 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-menu-title"
        className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl text-left animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">
              Menu Management
            </p>
            <h2 id="edit-menu-title" className="mt-1 text-xl font-black text-slate-950">
              Edit Menu: {item.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            aria-label="Close edit menu dialog"
            className="rounded-md p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-5 p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-5">
              <div>
                <label htmlFor="edit-menu-name" className="block text-sm font-bold text-slate-700">
                  Nama Menu
                </label>
                <input
                  id="edit-menu-name"
                  name="name"
                  type="text"
                  required
                  maxLength={100}
                  disabled={isPending}
                  defaultValue={item.name}
                  placeholder="Contoh: Nasi Goreng"
                  className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label htmlFor="edit-menu-qty" className="block text-sm font-bold text-slate-700">
                  Qty
                </label>
                <input
                  id="edit-menu-qty"
                  name="qty"
                  type="number"
                  required
                  min={0}
                  max={10000}
                  step={1}
                  disabled={isPending}
                  defaultValue={item.qty}
                  placeholder="0"
                  className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="edit-menu-photo" className="block text-sm font-bold text-slate-700">
                Photo
              </label>
              <label
                htmlFor="edit-menu-photo"
                className="mt-2 flex h-56 w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-slate-200 text-center transition hover:border-[var(--color-primary)] hover:bg-slate-100"
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="Menu preview" className="h-full w-full object-contain" />
                ) : (
                  <div className="px-4">
                    <svg className="mx-auto h-8 w-8 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M4 7h3l1.5-2h7L17 7h3v12H4z" />
                      <circle cx="12" cy="13" r="3" />
                    </svg>
                    <p className="mt-2 text-sm font-semibold text-slate-700">Choose photo</p>
                    <p className="mt-1 text-xs text-slate-500">JPG, PNG, atau WebP · Maks. 5 MB</p>
                  </div>
                )}
              </label>
              <input
                id="edit-menu-photo"
                name="photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={isPending}
                onChange={handlePhotoChange}
                className="sr-only"
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-menu-description" className="block text-sm font-bold text-slate-700">
              Description
            </label>
            <textarea
              id="edit-menu-description"
              name="description"
              rows={4}
              maxLength={500}
              disabled={isPending}
              defaultValue={item.note}
              placeholder="Tambahkan deskripsi menu"
              className="mt-2 w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
            />
          </div>

          {errorMessage ? (
            <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}