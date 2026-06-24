// components/menu-card.tsx
"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { takeMenuItemAction } from "@/app/staff/actions";

export type MenuCardData = {
  id: string;
  name: string;
  note: string;
  qty: number;
  imageUrl?: string | null;
};

type MenuCardProps = {
  item: MenuCardData;
  canTake?: boolean;
  onEdit?: (item: MenuCardData) => void;
  isKiosk?: boolean;
};

export function MenuCard({ item, canTake = false, onEdit, isKiosk = false }: MenuCardProps) {
  const router = useRouter();
  const [optimisticQty, decreaseOptimisticQty] = useOptimistic(
    item.qty,
    (currentQty) => Math.max(0, currentQty - 1),
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const isEmpty = optimisticQty <= 0;

  function handleTake() {
    if (isEmpty || !canTake || isPending) return;

    setErrorMessage("");
    startTransition(async () => {
      decreaseOptimisticQty(undefined);
      const result = await takeMenuItemAction(item.id);

      if (!result.success) {
        setErrorMessage(result.message);
      }

      router.refresh();
    });
  }

  // REFINED STATUS PILL GRAPHICS: Replaced all yellow parameters with deep professional blues/slates
  const isLowStock = optimisticQty > 0 && optimisticQty <= 5;
  const pillStyles = isEmpty
    ? "bg-rose-50 text-rose-700 border-rose-200"
    : isLowStock
      ? "bg-slate-100 text-slate-700 border-slate-300" // <-- Replaced yellow background with muted elegant silver-slate
      : "bg-emerald-50 text-emerald-700 border-emerald-200";

  const pillLabel = isEmpty ? "Out of Stock" : isLowStock ? "Low stock" : "Available";

  return (
    <article 
      className={`relative flex flex-col overflow-hidden rounded-xl bg-white text-left h-full w-full min-h-0 ${
        isKiosk ? "p-2.5 gap-2" : "min-h-[520px]"
      }`}
    >
      {/* Edit trigger button */}
      {onEdit && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(item);
          }}
          className={`absolute z-10 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 shadow-xs transition-all hover:bg-slate-50 hover:text-slate-700 active:scale-90 cursor-pointer ${
            isKiosk ? "top-2.5 right-2.5 h-7 w-7" : "top-4 right-4 h-9 w-9"
          }`}
          aria-label="Edit menu item"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </button>
      )}

      {/* Top Header Section */}
      <div className={`flex items-center justify-center border-b border-slate-100 px-3 text-center shrink-0 ${
        isKiosk ? "h-14 py-1" : "min-h-32 py-4"
      }`}>
        <div className="flex flex-col items-center">
          {/* Rendered updated clean status badge text layout */}
          <span className={`px-2.5 py-0.5 text-[10px] font-bold border rounded-full tracking-wide ${pillStyles}`}>
            {pillLabel}
          </span>
          <p className={`font-black leading-none text-blue-950 ${
            isKiosk ? "text-2xl mt-1.5" : "text-6xl mt-2"
          }`}>
            {optimisticQty}
          </p>
        </div>
      </div>

      {/* Media Image Frame */}
      <div className={`w-full items-center justify-center bg-slate-50 rounded-xl overflow-hidden shrink-0 flex border border-slate-100 ${
        isKiosk ? "h-24" : "h-64"
      }`}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-200 text-xs font-semibold text-slate-500">
            No Photo
          </div>
        )}
      </div>
      
      {/* Description and Action Group */}
      <div className="flex flex-1 flex-col justify-between min-h-0 px-0.5">
        <div className="overflow-hidden">
          <h2 className="text-sm font-bold text-slate-900 truncate">{item.name}</h2>
          <p className="text-[11px] text-slate-400 truncate mt-0.5">
            {item.note || "No note"}
          </p>
        </div>

        <div className="flex w-full flex-col items-center gap-1 mt-auto shrink-0">
          <Button
            type="button"
            variant={isEmpty || !canTake ? "ghost" : "secondary"}
            disabled={isEmpty || !canTake || isPending}
            onClick={handleTake}
            className={`w-full font-bold transition-all text-xs tracking-wide uppercase h-8 bg-slate-800 text-white hover:bg-slate-950 rounded-xl shadow-xs`}
          >
            TAKE
          </Button>
        </div>
      </div>
    </article>
  );
}