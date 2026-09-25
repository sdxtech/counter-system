"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { MenuCardData } from "@/components/menu-card";
import { AddMenuDialog } from "./add-menu-dialog";
import { MenuCarousel } from "./menu-carousel";
import { ResetMenusDialog } from "./reset-menus-dialog";
import { LogoutDialog } from "./logout-dialog";
import { TakeMenuProvider, useTakeMenuQueue } from "@/components/take-menu-provider";

type StaffMenuDashboardProps = {
  items: MenuCardData[];
};

export function StaffMenuDashboard({ items }: StaffMenuDashboardProps) {
  return (
    <TakeMenuProvider items={items}>
      <StaffMenuDashboardContent items={items} />
    </TakeMenuProvider>
  );
}

function StaffMenuDashboardContent({ items }: StaffMenuDashboardProps) {
  const [isFullMode, setIsFullMode] = useState(false);
  const takeQueue = useTakeMenuQueue();
  const hasPendingTakes = Boolean(takeQueue?.snapshot.pending);
  const needsStockRefresh = Object.values(takeQueue?.snapshot.items ?? {}).some((item) => item.needsRefresh);
  const hasReachedMenuLimit = items.length >= 6;
  const controlClassName =
    "inline-flex h-auto items-center justify-center rounded-[12px] border border-transparent !bg-white/10 px-2 py-1 text-xs font-semibold uppercase !text-white/80 !shadow-none !ring-0 backdrop-blur-md transition hover:-translate-y-0.5 hover:!bg-[#ff9500]/20 hover:!text-white focus-visible:border-transparent focus-visible:outline-none focus-visible:!ring-0 disabled:!bg-white/5 disabled:!text-white/35";

  return (
    <>
      <section className="relative min-h-screen overflow-hidden bg-[#0b0f23] text-white">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,#0f0f23,#1a1a2e,#16213e)]" />

        <div className="absolute right-5 top-5 z-20 flex flex-wrap justify-end gap-2.5 max-sm:right-2.5 max-sm:top-2.5 max-sm:gap-2.5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsFullMode(true)}
            className={controlClassName}
          >
            Full Mode
          </Button>
          <AddMenuDialog
            disabled={hasReachedMenuLimit || hasPendingTakes}
            triggerLabel="Add Menu"
            triggerClassName={controlClassName}
            showTriggerIcon={false}
          />
          <ResetMenusDialog
            disabled={items.length === 0 || hasPendingTakes || needsStockRefresh}
            triggerLabel="Reset"
            triggerClassName={controlClassName}
          />
          <LogoutDialog triggerClassName={controlClassName} disabled={hasPendingTakes} />
        </div>

        {hasReachedMenuLimit ? (
          <p role="status" className="absolute left-4 top-4 z-20 text-xs font-semibold text-white/55">
            Menu aktif maksimal 6 item.
          </p>
        ) : null}

        <MenuCarousel items={items} />
      </section>

      {isFullMode ? (
        <div className="fixed inset-0 z-40 overflow-hidden bg-[#0b0f23] text-white">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,#0f0f23,#1a1a2e,#16213e)]" />
          <div className="absolute right-5 top-5 z-20 flex flex-wrap justify-end gap-2.5 max-sm:right-2.5 max-sm:top-2.5 max-sm:gap-2.5">
            <Button
              type="button"
              onClick={() => setIsFullMode(false)}
              aria-label="Exit full mode"
              title="Exit full mode"
              className={controlClassName}
            >
              <span aria-hidden="true" className="text-base leading-none">
                x
              </span>
            </Button>
          </div>
          <MenuCarousel items={items} isFullMode />
        </div>
      ) : null}
    </>
  );
}
