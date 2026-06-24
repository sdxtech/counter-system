import { getMenuStatus } from "@/lib/counter";

type StatusPillProps = {
  qty: number;
};

export function StatusPill({ qty }: StatusPillProps) {
  const status = getMenuStatus(qty);
  const label = {
    available: "Available",
    low: "Low stock",
    empty: "Empty",
  }[status];

  const className = {
    available: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    low: "bg-yellow-50 text-yellow-800 ring-yellow-200",
    empty: "bg-red-50 text-red-700 ring-red-200",
  }[status];

  return (
    <span className={`inline-flex rounded-full px-4 py-1.5 text-lg font-semibold ring-1 ${className}`}>
      {label}
    </span>
  );
}
