"use client";

import { useRef } from "react";
import { MenuCard, type MenuCardData } from "@/components/menu-card";

type MenuCarouselProps = {
  items: MenuCardData[];
};

export function MenuCarousel({ items }: MenuCarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const isCompact = items.length > 2;

  function scrollCarousel(direction: -1 | 1) {
    const carousel = carouselRef.current;
    if (!carousel) return;

    carousel.scrollBy({
      left: direction * Math.max(280, carousel.clientWidth * 0.75),
      behavior: "smooth",
    });
  }

  if (items.length === 0) return null;

  return (
    <section aria-label="Menu carousel" className="relative">
      {isCompact ? (
        <>
          <button
            type="button"
            onClick={() => scrollCarousel(-1)}
            aria-label="Previous menus"
            className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white text-xl font-bold text-slate-700 shadow-md transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] sm:left-3"
          >
            &larr;
          </button>
          <button
            type="button"
            onClick={() => scrollCarousel(1)}
            aria-label="Next menus"
            className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white text-xl font-bold text-slate-700 shadow-md transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] sm:right-3"
          >
            &rarr;
          </button>
        </>
      ) : null}

      <div
        ref={carouselRef}
        className={`snap-x snap-mandatory overflow-x-auto scroll-smooth pb-4 ${
          isCompact ? "px-14 sm:px-16" : ""
        }`}
      >
        <div className="flex w-max min-w-full justify-center gap-5">
          {items.map((item) => (
            <div
              key={item.id}
              className={`shrink-0 snap-start ${
                isCompact
                  ? "w-[min(82vw,19rem)]"
                  : items.length === 1
                    ? "w-full max-w-lg"
                    : "w-[calc(50%-0.625rem)] min-w-80"
              }`}
            >
              <MenuCard item={item} canTake />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
