"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createMenuAction, type CreateMenuState } from "./actions";

const initialCreateMenuState: CreateMenuState = {
  status: "idle",
  message: "",
  submissionId: "",
};

export function AddMenuDialog() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setPreviewUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  function closeDialog() {
    if (isPending) return;

    formRef.current?.reset();
    setPreviewUrl(null);
    setErrorMessage("");
    setIsOpen(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createMenuAction(initialCreateMenuState, formData);

      if (result.status === "error") {
        setErrorMessage(result.message);
        return;
      }

      formRef.current?.reset();
      setPreviewUrl(null);
      setIsOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        onClick={() => {
          setErrorMessage("");
          setIsOpen(true);
        }}
        className="gap-2"
      >
        <span className="text-xl leading-none" aria-hidden="true">
          +
        </span>
        Add Menu
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
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-menu-title"
            className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">
                  Menu Management
                </p>
                <h2 id="add-menu-title" className="mt-1 text-xl font-black text-slate-950">
                  Add New Menu
                </h2>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                disabled={isPending}
                aria-label="Close add menu dialog"
                className="rounded-md p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                    <label htmlFor="menu-name" className="block text-sm font-bold text-slate-700">
                      Nama Menu
                    </label>
                    <input
                      id="menu-name"
                      name="name"
                      type="text"
                      required
                      maxLength={100}
                      disabled={isPending}
                      placeholder="Contoh: Nasi Goreng"
                      className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label htmlFor="menu-qty" className="block text-sm font-bold text-slate-700">
                      Qty
                    </label>
                    <input
                      id="menu-qty"
                      name="qty"
                      type="number"
                      required
                      min={0}
                      max={10000}
                      step={1}
                      disabled={isPending}
                      placeholder="0"
                      className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="menu-photo" className="block text-sm font-bold text-slate-700">
                    Photo
                  </label>
                  <label
                    htmlFor="menu-photo"
                    className="mt-2 flex h-56 w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-slate-200 text-center transition hover:border-[var(--color-primary)] hover:bg-slate-100"
                  >
                    {previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
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
                    id="menu-photo"
                    name="photo"
                    type="file"
                    required
                    accept="image/jpeg,image/png,image/webp"
                    disabled={isPending}
                    onChange={handlePhotoChange}
                    className="sr-only"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="menu-description" className="block text-sm font-bold text-slate-700">
                  Description
                </label>
                <textarea
                  id="menu-description"
                  name="description"
                  rows={4}
                  maxLength={500}
                  disabled={isPending}
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
                <Button type="button" variant="ghost" onClick={closeDialog} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
