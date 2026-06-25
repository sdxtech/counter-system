// app/staff/menu-carousel.tsx
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { MenuCard, type MenuCardData } from "@/components/menu-card";
import { EditMenuDialog } from "./edit-menu-dialog";

type MenuCarouselProps = {
  items: MenuCardData[];
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export function MenuCarousel({ items }: MenuCarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  const [isFullMode, setIsFullMode] = useState(false);
  const [activeEditItem, setActiveEditItem] = useState<MenuCardData | null>(null);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  }

  if (items.length === 0) return null;

  const totalItems = items.length;
  const isMultiRow = totalItems > 4;

  let gridLayoutClass = "grid-cols-1 grid-rows-1";
  if (totalItems === 2) gridLayoutClass = "grid-cols-2 grid-rows-1";
  if (totalItems === 3) gridLayoutClass = "grid-cols-3 grid-rows-1";
  if (totalItems === 4) gridLayoutClass = "grid-cols-4 grid-rows-1";
  
  if (totalItems === 5 || totalItems === 6) gridLayoutClass = "grid-cols-3 grid-rows-2";
  if (totalItems === 7 || totalItems === 8) gridLayoutClass = "grid-cols-4 grid-rows-2";
  if (totalItems >= 9) gridLayoutClass = "grid-cols-5 grid-rows-2";

  const containerMaxWidth = totalItems === 1 ? "max-w-xs" : "w-full max-w-6xl";

  return (
    <div className="w-full flex-1 flex flex-col justify-center items-center overflow-visible min-h-[calc(100vh-100px)] relative mt-1">
      
      {/* ==================== COMPACTED NAVBAR CONTROLS ==================== */}
      {/* Reduced the top offset positioning to pull the main panel higher up the page */}
      {!isFullMode && (
        <div className="absolute -top-[42px] left-0 right-0 w-full flex items-center justify-between px-2 z-50 h-8 pointer-events-none">
          <div className="pointer-events-auto">
            <button
              type="button"
              onClick={() => setIsFullMode(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold bg-slate-800 text-white rounded-lg shadow-sm hover:bg-slate-900 transition-all active:scale-95 cursor-pointer"
            >
              🗖 Enter Kiosk Mode
            </button>
          </div>

          <div className="pointer-events-auto">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-800 transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              Logout ↗
            </button>
          </div>
        </div>
      )}

      {/* ==================== EXPANDED SCROLLLESS CABINET ENVELOPE ==================== */}
      {/* Opened up the vertical threshold limits to max-h-[82vh] to eliminate bottom layout cropping */}
      <div className={isFullMode 
        ? "fixed inset-0 bg-slate-900/90 backdrop-blur-md z-40 flex flex-col justify-center items-center p-6 h-screen w-screen overflow-hidden select-none" 
        : "w-full bg-slate-200/50 rounded-3xl p-4 border border-slate-300/40 h-[480px] md:h-[580px] max-h-[82vh] overflow-hidden flex flex-col justify-center shadow-inner my-auto"
      }>
        
        {isFullMode && (
          <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-50">
            <button
              type="button"
              onClick={() => setIsFullMode(false)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              ✕ Exit Kiosk Mode
            </button>
          </div>
        )}

        {/* ==================== NON-SCROLLABLE GRID TRACK ==================== */}
        <section aria-label="Menu system container" className="relative w-full mx-auto flex items-center justify-center min-h-0 overflow-hidden h-full">
          <div
            ref={carouselRef}
            className={`w-full h-full grid ${gridLayoutClass} ${containerMaxWidth} gap-4 sm:gap-5 overflow-hidden px-1 py-1.5 items-center justify-center min-h-0`}
          >
            {items.map((item) => (
              <div
                key={item.id}
                className="w-full h-full min-h-0 flex flex-col justify-center overflow-hidden"
              >
                <div className="w-full h-full max-h-full bg-white rounded-xl border border-slate-200 border-t-8 border-t-blue-900 ring-1 ring-slate-300/40 shadow-sm overflow-hidden p-3 flex flex-col justify-between min-h-0">
                  <MenuCard 
                    item={item} 
                    canTake 
                    onEdit={(targetItem) => setActiveEditItem(targetItem)} 
                    isKiosk={true}
                    isMultiRow={isMultiRow}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

      <EditMenuDialog 
        item={activeEditItem} 
        isOpen={activeEditItem !== null} 
        onClose={() => setActiveEditItem(null)} 
      />

    </div>
  );
}