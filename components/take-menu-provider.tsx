"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { takeMenuItemAction } from "@/app/staff/actions";
import { TakeQueue } from "@/lib/take-queue";
import { getNumpadDigit, type MenuKeyBinding } from "@/lib/menu-keymap";

type TakeContextValue = {
  snapshot: ReturnType<TakeQueue["getSnapshot"]>;
  take: TakeQueue["take"];
};

const TakeContext = createContext<TakeContextValue | null>(null);

export function TakeMenuProvider({ items, children, keyBindings }: {
  items: { id: string; qty: number }[];
  children: ReactNode;
  keyBindings?: MenuKeyBinding[];
}) {
  const [queue] = useState(() => new TakeQueue(items, takeMenuItemAction));
  const snapshot = useSyncExternalStore(queue.subscribe, queue.getSnapshot, queue.getSnapshot);

  useEffect(() => { queue.syncItems(items); }, [items, queue]);

  useEffect(() => {
    if (!keyBindings?.length) return;
    const activeIds = new Set(items.map((item) => item.id));
    const bindingByDigit = new Map(keyBindings
      .filter((binding) => activeIds.has(binding.menu_item_id))
      .map((binding) => [binding.numpad_digit, binding.menu_item_id]));
    const heldKeys = new Set<string>();

    function handleKeyDown(event: KeyboardEvent) {
      const digit = getNumpadDigit(event.code);
      if (digit === null || event.defaultPrevented || event.isComposing ||
          event.ctrlKey || event.altKey || event.metaKey || event.shiftKey || document.hidden) return;
      const menuId = bindingByDigit.get(digit);
      if (!menuId) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable ||
          target.closest('input, textarea, select, [role="textbox"], [role="combobox"], [inert]'))) return;
      const blockingOverlay = Array.from(document.querySelectorAll<HTMLElement>(
        '[role="dialog"], [role="alertdialog"], [role="menu"], dialog[open]',
      )).some((element) => !element.closest("[inert]") && element.getClientRects().length > 0);
      if (blockingOverlay) return;

      event.preventDefault();
      if (event.repeat || heldKeys.has(event.code)) return;
      heldKeys.add(event.code);
      queue.take(menuId);
    }
    function handleKeyUp(event: KeyboardEvent) { heldKeys.delete(event.code); }
    function clearHeldKeys() { heldKeys.clear(); }

    // One listener on the shared provider, including when both views are mounted.
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", clearHeldKeys);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", clearHeldKeys);
    };
  }, [items, keyBindings, queue]);

  useEffect(() => {
    if (!snapshot.pending) return;
    function warnBeforeLeaving(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [snapshot.pending]);

  return (
    <TakeContext.Provider value={{ snapshot, take: queue.take }}>
      {children}
    </TakeContext.Provider>
  );
}

export function useTakeMenuQueue() {
  return useContext(TakeContext);
}
