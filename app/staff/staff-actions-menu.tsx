"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { AddMenuDialog } from "./add-menu-dialog";
import { ResetMenusDialog } from "./reset-menus-dialog";
import { LogoutDialog } from "./logout-dialog";

type StaffActionsMenuProps = {
  onFullMode: () => void;
  menuCount: number;
  hasPendingTakes: boolean;
  needsStockRefresh: boolean;
};

type DialogAction = "add" | "reset" | "logout";

export function StaffActionsMenu({ onFullMode, menuCount, hasPendingTakes, needsStockRefresh }: StaffActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeDialog, setActiveDialog] = useState<DialogAction | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const addDisabled = menuCount >= 6 || hasPendingTakes;
  const resetDisabled = menuCount === 0 || hasPendingTakes || needsStockRefresh;
  const itemClassName = "flex min-h-11 w-full items-center rounded-md px-4 py-2 text-left text-sm font-semibold text-white/90 outline-none transition hover:bg-orange-400/15 hover:text-orange-200 focus-visible:bg-orange-400/15 focus-visible:ring-2 focus-visible:ring-orange-300 disabled:cursor-not-allowed disabled:text-white/35 disabled:hover:bg-transparent";

  useEffect(() => {
    if (!isOpen) return;
    panelRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();

    function handleOutsideClick(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    return () => document.removeEventListener("pointerdown", handleOutsideClick);
  }, [isOpen]);

  useEffect(() => {
    if (!activeDialog) return;
    const dialog = dialogRef.current;
    const selector = 'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]';
    dialog?.querySelector<HTMLElement>(selector)?.focus();

    function keepFocusInDialog(event: globalThis.KeyboardEvent) {
      if (event.key !== "Tab") return;
      const elements = Array.from(dialog?.querySelectorAll<HTMLElement>(selector) ?? []).filter((element) => element.getClientRects().length > 0);
      const first = elements[0];
      const last = elements.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", keepFocusInDialog);
    return () => document.removeEventListener("keydown", keepFocusInDialog);
  }, [activeDialog]);

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
      return;
    }

    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const buttons = Array.from(panelRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
    if (!buttons.length) return;
    const current = buttons.findIndex((button) => button === document.activeElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next]?.focus();
  }

  function openDialog(action: DialogAction) {
    setIsOpen(false);
    setActiveDialog(action);
  }

  function closeDialog() {
    setActiveDialog(null);
    triggerRef.current?.focus();
  }

  return (
    <>
      <div
        ref={rootRef}
        className="absolute right-4 top-4 z-30"
        onKeyDown={handleMenuKeyDown}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
        }}
      >
        <button
          ref={triggerRef}
          type="button"
          id={`${menuId}-trigger`}
          aria-label="Menu aksi"
          title="Menu aksi"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-controls={isOpen ? menuId : undefined}
          onClick={() => setIsOpen((current) => !current)}
          onKeyDown={(event) => {
            if (!isOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
              event.preventDefault();
              event.stopPropagation();
              setIsOpen(true);
            }
          }}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-white/10 text-white/90 shadow-lg transition hover:bg-orange-400/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
        >
          {/* Bootstrap Icons: https://icons.getbootstrap.com/icons/list/ */}
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-list" viewBox="0 0 16 16" aria-hidden="true">
            <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5" />
          </svg>
        </button>

        {isOpen ? (
          <div ref={panelRef} id={menuId} role="menu" aria-labelledby={`${menuId}-trigger`} className="absolute right-0 top-full mt-2 max-h-[calc(100dvh-5rem)] w-48 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-white/15 bg-[#1a1a2e] p-1.5 shadow-2xl">
            <button type="button" role="menuitem" className={itemClassName} onClick={() => { setIsOpen(false); onFullMode(); }}>
              Full Mode
            </button>
            <button type="button" role="menuitem" className={itemClassName} disabled={addDisabled} onClick={() => openDialog("add")}>
              Add Menu
            </button>
            <button type="button" role="menuitem" className={itemClassName} disabled={resetDisabled} onClick={() => openDialog("reset")}>
              Reset
            </button>
            <button type="button" role="menuitem" className={itemClassName} disabled={hasPendingTakes} onClick={() => openDialog("logout")}>
              Logout
            </button>
          </div>
        ) : null}
      </div>

      <div ref={dialogRef}>
        {activeDialog === "add" ? <AddMenuDialog disabled={addDisabled} onClose={closeDialog} /> : null}
        {activeDialog === "reset" ? <ResetMenusDialog disabled={resetDisabled} onClose={closeDialog} /> : null}
        {activeDialog === "logout" ? <LogoutDialog disabled={hasPendingTakes} onClose={closeDialog} /> : null}
      </div>
    </>
  );
}
