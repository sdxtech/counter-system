"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { takeMenuItemAction } from "@/app/staff/actions";

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
  isFullMode?: boolean;
  itemCount?: number;
};

export function MenuCard({
  item,
  canTake = false,
  onEdit,
  onDelete,
  controlsDisabled = false,
  compact = false,
  itemCount = 1,
}: MenuCardProps) {
  const router = useRouter();
  const [optimisticQty, decreaseOptimisticQty] = useOptimistic(
    item.qty,
    (currentQty) => Math.max(0, currentQty - 1),
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const isEmpty = optimisticQty <= 0;
  const statusLabel = isEmpty ? "Empty" : optimisticQty <= 5 ? "Low Stock" : "Available";
  const isSingleCard = itemCount <= 1;
  const isFourCard = itemCount === 4;
  const hasFoodDetails = Boolean(item.note || item.nutritionFact);

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

  const takeButton = (
    <button
      type="button"
      disabled={isEmpty || !canTake || isPending}
      onClick={handleTake}
      className={
        compact
          ? "mt-2 h-8 w-[110px] rounded-[20px] border-0 bg-[linear-gradient(135deg,#ff9500,#ff6b35)] text-[0.85rem] font-bold uppercase text-white shadow-[0_6px_16px_rgba(255,149,0,0.35)] transition hover:-translate-y-0.5 disabled:bg-white/10 disabled:from-white/10 disabled:to-white/10 disabled:text-white/35 disabled:shadow-none [@media_(hover:hover)_and_(pointer:fine)_and_(min-width:1024px)]:mt-1 [@media_(hover:hover)_and_(pointer:fine)_and_(min-width:1024px)]:h-6 [@media_(hover:hover)_and_(pointer:fine)_and_(min-width:1024px)]:w-[84px] [@media_(hover:hover)_and_(pointer:fine)_and_(min-width:1024px)]:text-[11px]"
          : isSingleCard
            ? "mt-[15px] h-[50px] w-[160px] rounded-[25px] border-0 bg-[linear-gradient(135deg,#ff9500,#ff6b35)] text-[1.2rem] font-bold uppercase text-white shadow-[0_8px_20px_rgba(255,149,0,0.4)] transition hover:-translate-y-1 hover:shadow-[0_12px_25px_rgba(255,149,0,0.6)] disabled:bg-white/10 disabled:from-white/10 disabled:to-white/10 disabled:text-white/35 disabled:shadow-none max-md:h-[45px] max-md:w-[140px] max-md:text-[1.1rem] max-[480px]:h-10 max-[480px]:w-[120px] max-[480px]:text-base"
            : `mt-2 h-10 w-[130px] rounded-[22px] border-0 bg-[linear-gradient(135deg,#ff9500,#ff6b35)] text-base font-bold uppercase text-white shadow-[0_7px_18px_rgba(255,149,0,0.38)] transition hover:-translate-y-0.5 disabled:bg-white/10 disabled:from-white/10 disabled:to-white/10 disabled:text-white/35 disabled:shadow-none ${
                isFourCard
                  ? "[@media_(hover:hover)_and_(pointer:fine)_and_(min-width:1024px)]:mt-1 [@media_(hover:hover)_and_(pointer:fine)_and_(min-width:1024px)]:h-8 [@media_(hover:hover)_and_(pointer:fine)_and_(min-width:1024px)]:w-[110px] [@media_(hover:hover)_and_(pointer:fine)_and_(min-width:1024px)]:text-sm"
                  : ""
              }`
      }
    >
      TAKE
    </button>
  );

  const imageFrame = (
    <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[inherit] bg-white/10">
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center px-5 text-center text-white/60">
          <div className={compact ? "text-3xl opacity-60" : "text-5xl opacity-60"} aria-hidden="true">
            &#128247;
          </div>
          <p className={compact ? "mt-2 text-sm font-medium leading-tight" : "mt-2.5 px-5 text-[1.1rem] font-medium leading-tight"}>
            Foto menu akan ditampilkan di sini
          </p>
        </div>
      )}
    </div>
  );

  const editButton = onEdit ? (
    <button
      type="button"
      onClick={() => onEdit(item)}
      disabled={controlsDisabled}
      aria-label={`Modify ${item.name}`}
      title="Modify"
      className={`flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/70 shadow-sm transition hover:bg-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${
        compact
          ? "[@media_(hover:hover)_and_(pointer:fine)_and_(min-width:1024px)]:h-6 [@media_(hover:hover)_and_(pointer:fine)_and_(min-width:1024px)]:w-6"
          : ""
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.25">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
      </svg>
    </button>
  ) : null;
  const deleteButton = onDelete ? (
    <button
      type="button"
      onClick={() => onDelete(item)}
      disabled={controlsDisabled}
      aria-label={`Delete ${item.name}`}
      title="Delete"
      className={`flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/70 shadow-sm transition hover:bg-red-500/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${
        compact
          ? "[@media_(hover:hover)_and_(pointer:fine)_and_(min-width:1024px)]:h-6 [@media_(hover:hover)_and_(pointer:fine)_and_(min-width:1024px)]:w-6"
          : ""
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.25">
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M6 6l1 15h10l1-15" />
        <path d="M10 11v6M14 11v6" />
      </svg>
    </button>
  ) : null;
  const showManagementControls = Boolean(editButton || deleteButton);
  const desktopFourCardControlsClassName =
    itemCount === 4
      ? "[@media_(hover:hover)_and_(pointer:fine)_and_(min-width:1024px)]:mt-6"
      : "";

  const normalTitleClassName = isSingleCard
    ? "mb-[15px] text-[clamp(1.8rem,4.2vw,2.5rem)] font-black uppercase leading-none text-white drop-shadow-[2px_2px_4px_rgba(0,0,0,0.5)] max-md:mb-2.5"
    : `mb-2 text-[clamp(1.25rem,2.6vw,2rem)] font-black uppercase leading-none text-white drop-shadow-[2px_2px_4px_rgba(0,0,0,0.5)] ${
        isFourCard
          ? "[@media_(hover:hover)_and_(pointer:fine)_and_(min-width:1024px)]:text-[clamp(0.95rem,2.4vh,1.25rem)]"
          : ""
      }`;
  const normalNumberClassName = isSingleCard
    ? "my-2.5 text-[clamp(5rem,14vh,8rem)] font-black uppercase leading-[0.9] text-white drop-shadow-[3px_3px_10px_rgba(0,0,0,0.7)] transition"
    : `my-1 text-[clamp(3.5rem,11vh,6rem)] font-black uppercase leading-[0.9] text-white drop-shadow-[3px_3px_10px_rgba(0,0,0,0.7)] transition ${
        isFourCard
          ? "[@media_(hover:hover)_and_(pointer:fine)_and_(min-width:1024px)]:text-[clamp(2.35rem,6.3vh,3.55rem)]"
          : ""
      }`;
  const normalPhotoClassName = isSingleCard
    ? "h-[min(29vh,280px)] min-h-[160px] w-[min(29vh,280px)] min-w-[160px] overflow-hidden rounded-[20px] border-4 border-[#ff9500] bg-white/10 shadow-[0_0_20px_rgba(255,149,0,0.4)] backdrop-blur-xl max-md:h-[30vh] max-md:w-[30vh] max-md:min-h-[150px] max-md:min-w-[150px] max-md:border-[3px] max-[480px]:h-[28vh] max-[480px]:w-[28vh] max-[480px]:min-h-[130px] max-[480px]:min-w-[130px] max-[480px]:border-2"
    : `h-[28vh] min-h-[130px] max-h-[260px] w-[28vh] min-w-[130px] max-w-[260px] overflow-hidden rounded-[20px] border-4 border-[#ff9500] bg-white/10 shadow-[0_0_20px_rgba(255,149,0,0.4)] backdrop-blur-xl max-md:h-[24vh] max-md:w-[24vh] max-md:min-h-[120px] max-md:min-w-[120px] max-md:border-[3px] ${
        isFourCard
          ? "[@media_(hover:hover)_and_(pointer:fine)_and_(min-width:1024px)]:h-[clamp(110px,16vh,160px)] [@media_(hover:hover)_and_(pointer:fine)_and_(min-width:1024px)]:min-h-[110px] [@media_(hover:hover)_and_(pointer:fine)_and_(min-width:1024px)]:w-[clamp(110px,16vh,160px)] [@media_(hover:hover)_and_(pointer:fine)_and_(min-width:1024px)]:min-w-[110px]"
          : ""
      }`;
  const normalNameClassName = isSingleCard
    ? "mt-3 flex min-h-10 max-w-full items-center justify-center break-words text-center text-[clamp(1.25rem,2.8vw,1.7rem)] font-bold leading-tight text-white drop-shadow-[2px_2px_6px_rgba(0,0,0,0.7)]"
    : `mt-2 flex min-h-9 max-w-full items-center justify-center break-words text-center text-[clamp(1rem,2vw,1.35rem)] font-bold leading-tight text-white drop-shadow-[2px_2px_6px_rgba(0,0,0,0.7)] ${
        isFourCard
          ? "[@media_(hover:hover)_and_(pointer:fine)_and_(min-width:1024px)]:mt-1 [@media_(hover:hover)_and_(pointer:fine)_and_(min-width:1024px)]:min-h-6 [@media_(hover:hover)_and_(pointer:fine)_and_(min-width:1024px)]:text-[clamp(0.95rem,2.4vh,1.25rem)]"
          : ""
      }`;
  const normalContentClassName = isSingleCard
    ? "min-h-screen gap-0 px-5 pb-8 pt-[clamp(3.25rem,8vh,4.5rem)] max-md:pt-[60px] max-[480px]:pt-[50px]"
    : `min-h-[calc(100vh-100px)] gap-3 px-4 pb-6 pt-20 max-md:min-h-[calc(100vh-75px)] max-md:pt-[60px] ${
        isFourCard
          ? "[@media_(hover:hover)_and_(pointer:fine)_and_(min-width:1024px)]:min-h-screen [@media_(hover:hover)_and_(pointer:fine)_and_(min-width:1024px)]:pt-12 [@media_(hover:hover)_and_(pointer:fine)_and_(min-width:1024px)]:pb-5"
          : ""
      }`;
  const detailsPanelClassName = compact
    ? "mt-3 grid w-full max-w-[36rem] grid-cols-2 overflow-hidden rounded-md border-2 border-[#ffb23e] text-left shadow-[0_0_10px_rgba(255,149,0,0.2)]"
    : "mt-4 grid w-full max-w-[39rem] grid-cols-2 overflow-hidden rounded-md border-[3px] border-[#ffb23e] text-left shadow-[0_0_14px_rgba(255,149,0,0.24)]";
  const detailsHeadingClassName = compact
    ? "text-center text-[clamp(0.82rem,1.7vh,1rem)] font-black leading-tight text-white"
    : "text-center text-[clamp(1rem,2.1vh,1.35rem)] font-black leading-tight text-white";
  const detailsTextClassName = compact
    ? "mt-2 line-clamp-4 whitespace-pre-line break-words text-[clamp(0.64rem,1.25vh,0.78rem)] font-bold leading-snug text-white"
    : "mt-3 line-clamp-4 whitespace-pre-line break-words text-[clamp(0.76rem,1.5vh,0.95rem)] font-bold leading-snug text-white";
  const detailsCellClassName = compact ? "min-w-0 px-3 py-2.5" : "min-w-0 px-5 py-3";
  const detailsDividerCellClassName = compact
    ? "min-w-0 border-l-2 border-[#ffb23e] px-3 py-2.5"
    : "min-w-0 border-l-[3px] border-[#ffb23e] px-5 py-3";
  const foodDetailsPanel = hasFoodDetails ? (
    <div className={detailsPanelClassName}>
      <div className={detailsCellClassName}>
        <h3 className={detailsHeadingClassName}>Food Description</h3>
        <p className={detailsTextClassName}>{item.note || " "}</p>
      </div>
      <div className={detailsDividerCellClassName}>
        <h3 className={detailsHeadingClassName}>Nutrition Fact</h3>
        <p className={detailsTextClassName}>{item.nutritionFact || " "}</p>
      </div>
    </div>
  ) : null;

  if (compact) {
    return (
      <article className="group relative flex min-h-[360px] items-center justify-center overflow-visible text-center">
        <div className="relative flex min-h-full w-full flex-col items-center justify-center px-[clamp(0.75rem,2vw,1.5rem)] py-3">
          {showManagementControls ? (
            <div className="absolute left-4 top-3 z-10 flex justify-center gap-2">
              {editButton}
              {deleteButton}
            </div>
          ) : null}
          <div className="flex min-h-0 w-full flex-1 items-center justify-center gap-[clamp(1rem,2vw,2rem)] max-sm:flex-col max-sm:gap-3">
            <div className="flex w-[clamp(8.25rem,15vw,13rem)] flex-none flex-col items-center justify-center text-center max-sm:w-full">
              <p className="text-[clamp(1rem,2.4vh,1.35rem)] font-black uppercase leading-none tracking-[0.04em] text-white drop-shadow-[2px_2px_4px_rgba(0,0,0,0.5)]">
                {statusLabel}
              </p>
              <p className="my-2 text-[clamp(2.8rem,7.5vh,4.8rem)] font-black uppercase leading-[0.9] text-white drop-shadow-[3px_3px_10px_rgba(0,0,0,0.7)]">
                {optimisticQty}
              </p>
              {takeButton}
            </div>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center text-center max-sm:w-full">
              <div className="h-[clamp(110px,17vh,170px)] w-[clamp(110px,17vh,170px)] overflow-hidden rounded-[20px] border-[3px] border-[#ff9500] bg-white/10 shadow-[0_0_20px_rgba(255,149,0,0.4)] backdrop-blur-xl">
                {imageFrame}
              </div>
              <h2 className="mt-2 flex min-h-7 max-w-full items-center justify-center break-words text-center text-[clamp(1rem,2.4vh,1.25rem)] font-bold leading-tight text-white drop-shadow-[2px_2px_6px_rgba(0,0,0,0.7)]">
                {item.name || "Nama menu akan ditampilkan di sini"}
              </h2>
            </div>
          </div>
          {foodDetailsPanel}
        </div>
      </article>
    );
  }

  return (
    <article className="group relative flex min-h-screen items-center justify-center overflow-visible text-center">
      <div className={`flex w-full max-w-[800px] flex-col items-center ${normalContentClassName}`}>
        {showManagementControls ? (
          <div className={`mb-2 flex justify-center gap-2 ${desktopFourCardControlsClassName}`}>
            {editButton}
            {deleteButton}
          </div>
        ) : null}
        <div className="flex flex-none flex-col items-center text-center">
          <p className={normalTitleClassName}>
            {statusLabel}
          </p>
          <p className={normalNumberClassName}>
            {optimisticQty}
          </p>
          {takeButton}

          {errorMessage ? (
            <p role="alert" className="mt-3 max-w-64 rounded-full bg-red-500/15 px-3 py-1 text-center text-xs font-semibold text-red-100">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <div className={`mt-[clamp(1rem,2.4vh,1.75rem)] flex min-h-0 w-full flex-1 flex-col items-center justify-start text-center ${
          isFourCard ? "[@media_(hover:hover)_and_(pointer:fine)_and_(min-width:1024px)]:mt-1" : ""
        }`}>
          <div className={normalPhotoClassName}>
            {imageFrame}
          </div>
          <h2 className={normalNameClassName}>
            {item.name || "Nama menu akan ditampilkan di sini"}
          </h2>
          {foodDetailsPanel}
        </div>
      </div>
    </article>
  );
}
