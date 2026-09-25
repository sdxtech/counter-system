"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { takeMenuItemAction } from "@/app/staff/actions";
import { TakeQueue } from "@/lib/take-queue";

type TakeContextValue = {
  snapshot: ReturnType<TakeQueue["getSnapshot"]>;
  take: TakeQueue["take"];
};

const TakeContext = createContext<TakeContextValue | null>(null);

export function TakeMenuProvider({ items, children }: {
  items: { id: string; qty: number }[];
  children: ReactNode;
}) {
  const [queue] = useState(() => new TakeQueue(items, takeMenuItemAction));
  const snapshot = useSyncExternalStore(queue.subscribe, queue.getSnapshot, queue.getSnapshot);

  useEffect(() => { queue.syncItems(items); }, [items, queue]);

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
