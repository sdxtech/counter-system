"use client";

import { useTakeMenuQueue } from "@/components/take-menu-provider";
import styles from "./menu-card.module.css";

export type MenuCardData = {
  id: string;
  name: string;
  note: string;
  nutritionFact: string;
  qty: number;
  imageUrl?: string | null;
};

type MenuCardProps = {
  item: MenuCardData;
  canTake?: boolean;
  onEdit?: (item: MenuCardData) => void;
  onDelete?: (item: MenuCardData) => void;
  controlsDisabled?: boolean;
  compact?: boolean;
};

export function MenuCard({
  item,
  canTake = false,
  onEdit,
  onDelete,
  controlsDisabled = false,
  compact = false,
}: MenuCardProps) {
  const takeQueue = useTakeMenuQueue();
  const takeState = takeQueue?.snapshot.items[item.id];
  const optimisticQty = takeState?.qty ?? item.qty;
  const errorMessage = takeState?.error ?? "";
  const isEmpty = optimisticQty <= 0;
  const statusLabel = isEmpty ? "Empty" : optimisticQty <= 5 ? "Low Stock" : "Available";

  function handleTake() {
    if (isEmpty || !canTake) return;
    takeQueue?.take(item.id);
  }

  return (
    <article className={`${styles.card} ${compact ? styles.compact : ""}`}>
      <div className={styles.counter}>
        <p className={styles.status}>{statusLabel}</p>
        <p className={styles.quantity}>{optimisticQty}</p>
        <button
          type="button"
          aria-label={`Ambil ${item.name}`}
          disabled={isEmpty || !canTake || !takeState || takeState.needsRefresh}
          onClick={handleTake}
          className={styles.takeButton}
        >
          Take
        </button>
        {canTake && errorMessage ? (
          <div className="mt-3 max-w-64 rounded-lg bg-red-500/15 px-3 py-2 text-center text-xs text-red-100">
            <p role="alert">{errorMessage}</p>
            {takeState?.needsRefresh && (
              <button
                type="button"
                onClick={() => window.location.reload()}
                disabled={Boolean(takeQueue?.snapshot.pending)}
                className="mt-2 font-semibold underline disabled:opacity-50"
              >
                Muat ulang stok
              </button>
            )}
          </div>
        ) : null}
      </div>

      <div className={styles.photo}>
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt={item.name} className={styles.image} />
        ) : (
          <div className={styles.placeholder}>
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M4 6h4l2-2h4l2 2h4v14H4z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <p>Foto menu akan ditampilkan di sini</p>
          </div>
        )}
        {onEdit || onDelete ? (
          <div className={styles.managementControls}>
            {onEdit ? (
              <button
                type="button"
                onClick={() => onEdit({ ...item, qty: optimisticQty })}
                disabled={controlsDisabled}
                aria-label={`Modify ${item.name}`}
                title="Modify"
                className={styles.managementButton}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                </svg>
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(item)}
                disabled={controlsDisabled}
                aria-label={`Delete ${item.name}`}
                title="Delete"
                className={styles.managementButton}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 11v6M14 11v6" />
                </svg>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <h2 className={styles.name} title={item.name}>
        <span>{item.name || "Nama menu akan ditampilkan di sini"}</span>
      </h2>
      <div className={styles.details}>
        <section className={styles.detailSection} aria-label="Food Description" tabIndex={0}>
          <h3>Food Description</h3>
          <p>{item.note || "—"}</p>
        </section>
        <section className={styles.detailSection} aria-label="Nutrition Fact" tabIndex={0}>
          <h3>Nutrition Fact</h3>
          <p>{item.nutritionFact || "—"}</p>
        </section>
      </div>
    </article>
  );
}
