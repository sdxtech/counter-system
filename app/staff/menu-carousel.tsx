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
  const isCompact = items.length > 2;
  const [activeEditItem, setActiveEditItem] = useState<MenuCardData | null>(null);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  }

  if (items.length === 0) return null;

  return (
    <div className="w-full flex flex-col items-center h-full overflow-visible max-h-screen relative">
      
      {/* ==================== ABSOLUTE POSITIONED CONTROLS ==================== */}
      {!isFullMode && (
        <div className="absolute -top-[64px] left-0 right-0 w-full flex items-center justify-between px-4 z-50 h-10 pointer-events-none">
          
          {/* Left Slot: Enter Kiosk Toggle */}
          <div className="pointer-events-auto">
            <button
              type="button"
              onClick={() => setIsFullMode(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-slate-800 text-white rounded-xl shadow-md hover:bg-slate-900 transition-all active:scale-95 cursor-pointer"
            >
              🗖 Enter Kiosk Mode
            </button>
          </div>

          {/* Right Slot: Logout Button */}
          <div className="pointer-events-auto">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              Logout ↗
            </button>
          </div>

        </div>
      )}

      {/* ==================== THE CAROUSEL CONTAINER ENVELOPE ==================== */}
      {/* 
        Maintained the darker background layer from image_895c42.png to show off card structure, 
        but removed extra side padding since arrows are gone.
      */}
      <div className={isFullMode 
        ? "fixed inset-0 bg-slate-900/90 backdrop-blur-md z-40 flex flex-col justify-center items-center p-4 sm:p-6 h-screen w-screen overflow-hidden select-none" 
        : "w-full bg-slate-300/80 rounded-3xl p-4 sm:p-5 border border-slate-400/40 max-h-[calc(100vh-170px)] h-[390px] overflow-hidden flex flex-col justify-center mt-2 shadow-inner"
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

        {/* ==================== RESPONSIVE TRACK RUNNER ==================== */}
        {/* Removed arrow buttons completely and optimized container space */}
        <section aria-label="Menu carousel" className="relative w-full max-w-5xl mx-auto flex items-center justify-center min-h-0 overflow-hidden">
          
          <div
            ref={carouselRef}
            className="w-full snap-x snap-mandatory overflow-x-auto scroll-smooth no-scrollbar px-2"
          >
            <div className="flex w-max min-w-full justify-center gap-4 sm:gap-6 items-center mx-auto h-[300px] sm:h-[320px] max-h-[54vh] py-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`shrink-0 snap-start flex flex-col justify-center h-full max-h-full transition-transform duration-200 hover:scale-[1.01] ${
                    isCompact
                      ? "w-[min(74vw,14rem)] sm:w-56"
                      : items.length === 1
                        ? "w-full max-w-[220px] sm:max-w-xs"
                        : "w-[min(44vw,16rem)] min-w-[130px] sm:min-w-[15rem]"
                  }`}
                >
                  
                  <div className="w-full h-full max-h-full bg-white rounded-2xl border border-slate-200 border-t-8 border-t-blue-900 ring-1 ring-slate-300/40 shadow-md overflow-hidden p-2 flex flex-col justify-between">
                    <MenuCard 
                      item={item} 
                      canTake 
                      onEdit={(targetItem) => setActiveEditItem(targetItem)} 
                      isKiosk={true} 
                    />
                  </div>
                  
                </div>
              ))}
            </div>
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