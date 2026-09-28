"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { MenuCardData } from "@/components/menu-card";
import { MenuCarousel } from "./menu-carousel";
import { StaffActionsMenu } from "./staff-actions-menu";
import { TakeMenuProvider, useTakeMenuQueue } from "@/components/take-menu-provider";
import type { MenuKeyBinding } from "@/lib/menu-keymap";

type StaffMenuDashboardProps = {
  items: MenuCardData[];
  keyBindings?: MenuKeyBinding[];
};

export function StaffMenuDashboard({ items, keyBindings }: StaffMenuDashboardProps) {
  return (
    <TakeMenuProvider items={items} keyBindings={keyBindings}>
      <StaffMenuDashboardContent items={items} />
    </TakeMenuProvider>
  );
}

function StaffMenuDashboardContent({ items }: StaffMenuDashboardProps) {
  const [isFullMode, setIsFullMode] = useState(false);
  useEffect(() => {
    const elements = [document.documentElement, document.body];
    const previousStyles = elements.map((element) => ({
      overflow: element.style.overflow,
      overscrollBehavior: element.style.overscrollBehavior,
    }));
    for (const element of elements) {
      element.style.overflow = "hidden";
      element.style.overscrollBehavior = "none";
    }
    return () => {
      elements.forEach((element, index) => {
        element.style.overflow = previousStyles[index].overflow;
        element.style.overscrollBehavior = previousStyles[index].overscrollBehavior;
      });
    };
  }, []);
  const takeQueue = useTakeMenuQueue();
  const hasPendingTakes = Boolean(takeQueue?.snapshot.pending);
  const needsStockRefresh = Object.values(takeQueue?.snapshot.items ?? {}).some((item) => item.needsRefresh);
  const controlClassName =
    "inline-flex h-auto items-center justify-center rounded-[12px] border border-transparent !bg-white/10 px-2 py-1 text-xs font-semibold uppercase !text-white/80 !shadow-none !ring-0 backdrop-blur-md transition hover:-translate-y-0.5 hover:!bg-[#ff9500]/20 hover:!text-white focus-visible:border-transparent focus-visible:outline-none focus-visible:!ring-0 disabled:!bg-white/5 disabled:!text-white/35";

  return (
    <>
      <section className="fixed inset-0 overflow-hidden bg-[#0b0f23] text-white" inert={isFullMode}>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,#0f0f23,#1a1a2e,#16213e)]" />

        <StaffActionsMenu
          onFullMode={() => setIsFullMode(true)}
          menuCount={items.length}
          hasPendingTakes={hasPendingTakes}
          needsStockRefresh={needsStockRefresh}
        />

        <MenuCarousel items={items} />
      </section>

      {isFullMode ? (
        <div className="fixed inset-0 z-40 overflow-hidden bg-[#0b0f23] text-white">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,#0f0f23,#1a1a2e,#16213e)]" />
          <div className="absolute inset-y-0 left-0 z-20 flex w-12 justify-center pt-4">
            <Button
              type="button"
              onClick={() => setIsFullMode(false)}
              aria-label="Exit full mode"
              autoFocus
              title="Exit full mode"
              className={`${controlClassName} !h-8 !w-8 !rounded-md !border-white/30`}
            >
              <span aria-hidden="true" className="text-base leading-none">
                ×
              </span>
            </Button>
          </div>
          <MenuCarousel items={items} isFullMode />
        </div>
      ) : null}
    </>
  );
}
