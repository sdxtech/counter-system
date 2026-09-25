"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MenuCard, type MenuCardData } from "@/components/menu-card";
import { deleteMenuItemAction } from "./actions";
import { EditMenuDialog } from "./edit-menu-dialog";
import { useTakeMenuQueue } from "@/components/take-menu-provider";
import styles from "./menu-carousel.module.css";

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
      ? styles.singleColumn
      : items.length === 2
        ? styles.twoColumns
        : styles.threeColumns;

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
      className={`${styles.viewport} ${isFullMode ? styles.fullMode : ""}`}
    >
      {deleteError ? (
        <p role="alert" className="relative z-30 mx-4 mb-3 mt-16 rounded-md bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-700">
          {deleteError}
        </p>
      ) : null}

      <div
        className={`${styles.grid} ${gridClassName}`}
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
