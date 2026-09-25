"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MenuCard, type MenuCardData } from "@/components/menu-card";
import { deleteMenuItemAction } from "./actions";
import { EditMenuDialog } from "./edit-menu-dialog";
import { useTakeMenuQueue } from "@/components/take-menu-provider";

type MenuCarouselProps = {
  items: MenuCardData[];
  isFullMode?: boolean;
};

export function MenuCarousel({ items, isFullMode = false }: MenuCarouselProps) {
  const router = useRouter();
  const takeQueue = useTakeMenuQueue();
  const hasPendingTakes = Boolean(takeQueue?.snapshot.pending);
  const [activeEditItem, setActiveEditItem] = useState<MenuCardData | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeletePending, startDeleteTransition] = useTransition();
  const isCompactGrid = items.length > 3;
  const gridClassName =
    items.length <= 1
      ? "grid-cols-1"
      : items.length === 2
        ? "grid-cols-1 lg:grid-cols-2"
        : items.length === 3
          ? "grid-cols-1 lg:grid-cols-3"
          : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  function handleDelete(item: MenuCardData) {
    const confirmed = window.confirm(`Hapus menu "${item.name}"?`);
    if (!confirmed || isDeletePending || hasPendingTakes) return;

    setDeleteError("");
    startDeleteTransition(async () => {
      const result = await deleteMenuItemAction(item.id);

      if (!result.success) {
        setDeleteError(result.message);
        return;
      }

      router.refresh();
    });
  }

  const displayItems =
    items.length > 0
      ? items
      : [
          {
            id: "empty-preview",
            name: "Nama menu akan ditampilkan di sini",
            note: "",
            nutritionFact: "",
            qty: 0,
            imageUrl: null,
          },
        ];

  return (
    <section
      aria-label="Menu grid"
      className={`relative z-10 ${isCompactGrid || isFullMode ? "h-screen overflow-y-auto overflow-x-hidden" : "min-h-screen overflow-visible"}`}
    >
      {deleteError ? (
        <p role="alert" className="absolute left-4 right-4 top-12 z-30 rounded-md bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-700">
          {deleteError}
        </p>
      ) : null}

      <div
        className={`grid w-full ${isCompactGrid ? "min-h-screen auto-rows-min gap-px overflow-visible px-4 pb-6 pt-16" : "min-h-screen"} ${gridClassName}`}
      >
        {displayItems.map((item) => (
          <MenuCard
            key={item.id}
            item={item}
            canTake={items.length > 0}
            onEdit={isFullMode ? undefined : setActiveEditItem}
            onDelete={isFullMode ? undefined : handleDelete}
            controlsDisabled={isDeletePending || hasPendingTakes || Boolean(takeQueue?.snapshot.items[item.id]?.needsRefresh)}
            compact={isCompactGrid}
            isFullMode={isFullMode}
            itemCount={items.length}
          />
        ))}
      </div>

      <EditMenuDialog
        key={activeEditItem?.id ?? "no-active-menu"}
        item={activeEditItem}
        onClose={() => setActiveEditItem(null)}
      />
    </section>
  );
}
