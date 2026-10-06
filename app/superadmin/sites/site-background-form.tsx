"use client";

import { useId, useRef, useState, useTransition } from "react";
import { DEFAULT_SITE_BACKGROUND, validateSiteBackground } from "@/lib/site-background";
import { saveSiteBackgroundAction, type BackgroundActionResult } from "./actions";

export function SiteBackgroundForm({ siteId, siteName, backgroundUrl }: {
  siteId: string;
  siteName: string;
  backgroundUrl: string | null;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<BackgroundActionResult | null>(null);

  function submit(formData: FormData) {
    startTransition(async () => {
      setResult(null);
      try {
        if (formData.get("reset") !== "true") {
          const file = formData.get("background");
          const error = file instanceof File ? await validateSiteBackground(file) : "Pilih file JPG terlebih dahulu.";
          if (error) {
            setResult({ success: false, message: error });
            return;
          }
        }
        const response = await saveSiteBackgroundAction(formData);
        setResult(response);
        if (response.success && inputRef.current) inputRef.current.value = "";
      } catch {
        setResult({ success: false, message: "Background gagal disimpan. Periksa koneksi lalu coba lagi." });
      }
    });
  }

  return (
    <div className="min-w-64 max-w-sm space-y-2">
      <div className="h-24 overflow-hidden rounded-lg bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element -- Preview uses the original storage URL. */}
        <img key={backgroundUrl} src={backgroundUrl || DEFAULT_SITE_BACKGROUND} alt={`Background ${siteName}`} className="h-full w-full object-cover" onError={(event) => {
          const image = event.currentTarget;
          if (image.getAttribute("src") !== DEFAULT_SITE_BACKGROUND) image.src = DEFAULT_SITE_BACKGROUND;
        }} />
      </div>
      <p className="text-xs text-slate-500">{backgroundUrl ? "Background khusus site" : "Background default"} · JPG/JPEG, maks. 5 MB</p>
      <form action={submit} className="space-y-2">
        <input type="hidden" name="siteId" value={siteId} />
        <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700">Background untuk {siteName}</label>
        <input ref={inputRef} id={inputId} type="file" name="background" accept="image/jpeg,.jpg,.jpeg" disabled={pending} className="block w-full text-xs text-slate-600 file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-2 file:py-2 file:font-semibold disabled:opacity-50" />
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={pending} className="rounded-md bg-purple-600 px-3 py-2 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-50">{pending ? "Menyimpan..." : "Upload background"}</button>
          {backgroundUrl && <button type="submit" name="reset" value="true" disabled={pending} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Gunakan default</button>}
        </div>
      </form>
      {result && <p role={result.success ? "status" : "alert"} className={`text-xs ${result.success ? "text-emerald-700" : "text-red-600"}`}>{result.message}</p>}
    </div>
  );
}
