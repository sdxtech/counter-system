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
  isMultiRow?: boolean;
};

export function MenuCard({ item, canTake = false, onEdit, isKiosk = false, isMultiRow = false }: MenuCardProps) {
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

  const isLowStock = optimisticQty > 0 && optimisticQty <= 5;
  const pillStyles = isEmpty
    ? "bg-rose-50 text-rose-700 border-rose-200"
    : isLowStock
      ? "bg-slate-100 text-slate-700 border-slate-300"
      : "bg-emerald-50 text-emerald-700 border-emerald-200";

  const pillLabel = isEmpty ? "Out of Stock" : isLowStock ? "Low stock" : "Available";

  return (
    <article className={`relative flex flex-col h-full w-full min-h-0 text-left bg-white overflow-hidden justify-between ${
      isMultiRow ? "p-1.5 gap-0.5" : "p-3 gap-2"
    }`}>
      
      {/* Edit trigger button */}
      {onEdit && !isKiosk && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(item);
          }}
          className="absolute z-20 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 shadow-xs transition-all hover:bg-slate-50 hover:text-slate-700 active:scale-90 cursor-pointer top-0 right-0 h-6 w-6"
          aria-label="Edit menu item"
        >
          <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </button>
      )}

      {/* ==================== REVISI 1 & 2: CENTERED HEADER (QTY & PILL) ==================== */}
      {/* Diubah menjadi flex-col item-center agar angka besar & status badge berada tepat di tengah atas */}
      <div className={`flex flex-col items-center justify-center border-b border-slate-100 shrink-0 w-full ${
        isMultiRow ? "pb-1 gap-0.5" : "pb-2 gap-1"
      }`}>
        {/* Status Badge (Available / Low stock) di Center Atas */}
        <span className={`font-bold border rounded-full tracking-wide bg-white uppercase whitespace-nowrap leading-none ${
          isMultiRow ? "px-1.5 py-0.5 text-[8px] scale-90" : "px-2 py-1 text-[10px]"
        }`}>
          <span className={pillStyles.split(" ").pop() + " " + pillStyles}>
            {pillLabel}
          </span>
        </span>
        
        {/* Angka Qty Saja, Diperbesar, dan Posisi di Tengah */}
        <p className={`font-black text-blue-950 leading-none ${
          isMultiRow ? "text-base mt-0.5" : "text-3xl mt-1"
        }`}>
          {optimisticQty}
        </p>
      </div>

      {/* 2. Media Image Frame */}
      <div className={`w-full flex items-center justify-center bg-slate-50 rounded-xl overflow-hidden border border-slate-100/60 flex-1 min-h-[40px] p-1 shrink-0 transition-all ${
        isMultiRow ? "max-h-[75px] my-0.5" : "max-h-[160px] my-2"
      }`}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-contain" />
        ) : (
          <div className={`flex h-full w-full items-center justify-center bg-slate-100 font-semibold text-slate-400 ${
            isMultiRow ? "text-[8px]" : "text-[11px]"
          }`}>
            No Photo
          </div>
        )}
      </div>

      {/* ==================== REVISI 3: CENTERED TEXT FIELD ==================== */}
      {/* Menambahkan text-center untuk Nama Menu dan Deskripsi di bawah foto */}
      <div className="w-full shrink-0 min-h-0 overflow-hidden my-0.5 text-center">
        <h2 className={`font-bold text-slate-900 truncate leading-tight transition-all ${
          isMultiRow ? "text-[11px]" : "text-[14px]"
        }`}>
          {item.name}
        </h2>
        <p className={`text-slate-400 truncate leading-none mt-0.5 transition-all ${
          isMultiRow ? "text-[9px]" : "text-[11px] mt-1"
        }`}>
          {item.note || "No description"}
        </p>
      </div>

      {/* 4. Action Button Row */}
      <div className="w-full shrink-0 pt-0.5">
        <Button
          type="button"
          variant={isEmpty || !canTake ? "ghost" : "secondary"}
          disabled={isEmpty || !canTake || isPending}
          onClick={handleTake}
          className={`w-full font-bold transition-all tracking-wider uppercase bg-slate-800 text-white hover:bg-slate-950 rounded-xl shadow-xs flex items-center justify-center ${
            isMultiRow ? "h-7 text-[10px]" : "h-9 text-[12px]"
          }`}
        >
          TAKE
        </Button>
      </div>

    </article>
  );
}