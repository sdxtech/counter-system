import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";

export type MenuCardData = {
  id: string;
  name: string;
  note: string;
  qty: number;
  imageUrl?: string | null;
};

type MenuCardProps = {
  item: MenuCardData;
};

export function MenuCard({ item }: MenuCardProps) {
  const isEmpty = item.qty <= 0;

  return (
    <article className="flex min-h-[420px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex aspect-[4/3] items-center justify-center bg-slate-100">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[var(--color-primary)] text-sm font-semibold text-white">
            No Photo
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-950">{item.name}</h2>
            <p className="mt-1 min-h-10 text-sm text-slate-600">{item.note || "No note"}</p>
          </div>
          <StatusPill qty={item.qty} />
        </div>
        <div className="mt-auto flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Qty</p>
            <p className="text-6xl font-black leading-none text-[var(--color-primary)]">{item.qty}</p>
          </div>
          <Button variant={isEmpty ? "ghost" : "secondary"} disabled={isEmpty}>
            TAKE
          </Button>
        </div>
      </div>
    </article>
  );
}
