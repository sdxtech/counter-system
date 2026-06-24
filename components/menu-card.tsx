"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusPill } from "@/components/status-pill";
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
};

export function MenuCard({ item, canTake = false }: MenuCardProps) {
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

  return (
    <article className="flex min-h-[520px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex min-h-32 items-center justify-center border-b border-slate-100 px-5 py-4 text-center">
        <div>
          <StatusPill qty={optimisticQty} />
          <p className="mt-2 text-6xl font-black leading-none text-[var(--color-primary)]">
            {optimisticQty}
          </p>
        </div>
      </div>

      <div className="flex h-64 w-full items-center justify-center bg-slate-200">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[var(--color-primary)] text-sm font-semibold text-white">
            No Photo
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <h2 className="text-lg font-bold text-slate-950">{item.name}</h2>
          <p className="mt-1 min-h-10 text-sm text-slate-600">{item.note || "No note"}</p>
        </div>

        <div className="mt-auto flex w-full flex-col items-center gap-2 pt-2">
          <Button
            variant={isEmpty || !canTake ? "ghost" : "secondary"}
            disabled={isEmpty || !canTake || isPending}
            onClick={handleTake}
            className="w-full"
          >
            TAKE
          </Button>
          {errorMessage ? (
            <p role="alert" className="max-w-64 text-center text-xs font-semibold text-red-700">
              {errorMessage}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
