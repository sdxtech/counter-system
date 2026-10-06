"use client";

import { useState } from "react";
import { DEFAULT_SITE_BACKGROUND } from "@/lib/site-background";

export function SiteBackground({ url }: { url?: string | null }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const source = url && url !== failedUrl ? url : DEFAULT_SITE_BACKGROUND;

  return (
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,#0f0f23,#1a1a2e,#16213e)]" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- Decorative, full-viewport storage image. */}
      <img src={source} alt="" className="h-full w-full object-cover" onError={() => setFailedUrl(source)} />
    </div>
  );
}
