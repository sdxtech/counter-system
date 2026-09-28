"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getNumpadDigit, MENU_POSITIONS, NUMPAD_DIGITS, type MenuKeyBinding } from "@/lib/menu-keymap";
import { saveKeyMapAction } from "./actions";

type KeyMapEditorProps = {
  sites: { id: string; name: string }[];
  siteId: string;
  initialBindings: MenuKeyBinding[];
  unavailable: boolean;
};

export function KeyMapEditor({ sites, siteId, initialBindings, unavailable }: KeyMapEditorProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<number, string>>(() =>
    Object.fromEntries(initialBindings.map((binding) => [binding.menu_position, String(binding.numpad_digit)])));
  const [dirty, setDirty] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function assignKey(position: number, value: string) {
    if (value !== "" && MENU_POSITIONS.some((other) => other !== position && selected[other] === value)) {
      setFeedback({ success: false, message: `Numpad ${value} sudah dipakai menu lain. Pilih nomor berbeda.` });
      return;
    }
    setSelected((current) => ({ ...current, [position]: value }));
    setDirty(true);
    setFeedback(null);
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending || unavailable || !siteId) return;
    setFeedback(null);
    const bindings = MENU_POSITIONS.flatMap((position) => {
      const digit = selected[position];
      return digit === undefined || digit === "" ? [] : [{ menu_position: position, numpad_digit: Number(digit) }];
    });
    startTransition(async () => {
      try {
        const result = await saveKeyMapAction({ siteId, bindings });
        setFeedback(result);
        if (result.success) setDirty(false);
      } catch {
        setFeedback({ success: false, message: "Belum dapat memastikan pengaturan tersimpan. Muat ulang halaman untuk memeriksa pengaturan terbaru." });
      }
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">Pintasan Take per Site</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Atur numpad 0–9 untuk Menu 1 sampai Menu 6 berdasarkan urutan kartu di dashboard.
          Pengaturan tetap berlaku saat nama atau isi menu diganti, termasuk setelah reset menu.
        </p>
        <label htmlFor="keymap-site" className="mt-5 block text-sm font-semibold text-slate-800">Site</label>
        <select
          id="keymap-site"
          value={siteId}
          disabled={isPending || sites.length === 0}
          onChange={(event) => {
            if (dirty && !window.confirm("Pindah site dan abaikan perubahan yang belum disimpan?")) return;
            router.push(`/superadmin/key-map?site=${encodeURIComponent(event.target.value)}`);
          }}
          className="mt-2 h-11 w-full max-w-md rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 disabled:opacity-50"
        >
          {sites.length === 0 ? <option value="">Belum ada site</option> : sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
        </select>
      </section>

      {unavailable ? (
        <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Pengaturan key map belum tersedia. Coba muat ulang setelah pembaruan selesai.
        </p>
      ) : null}

      <form onSubmit={save} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="font-bold text-slate-950">Posisi Menu dan Nomor Numpad</h3>
          <p className="mt-1 text-sm text-slate-500">Pilih nomor, atau fokuskan pilihan numpad lalu tekan tombol numpad yang diinginkan.</p>
        </div>
        <fieldset disabled={isPending || unavailable || !siteId}>
          <legend className="sr-only">Pengaturan pintasan menu</legend>
            <div className="divide-y divide-slate-100">
              {MENU_POSITIONS.map((position) => (
                <div key={position} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <label htmlFor={`key-${position}`} className="block break-words font-semibold text-slate-900">Menu {position}</label>
                    <p className="mt-1 text-xs text-slate-500">Tombol Take pada kartu ke-{position}</p>
                  </div>
                  <select
                    id={`key-${position}`}
                    aria-label={`Numpad untuk Menu ${position}`}
                    value={selected[position] ?? ""}
                    onChange={(event) => assignKey(position, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey || event.nativeEvent.isComposing) return;
                      const digit = getNumpadDigit(event.code);
                      if (digit === null) return;
                      event.preventDefault();
                      if (!event.repeat) assignKey(position, String(digit));
                    }}
                    className="h-11 w-full shrink-0 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 disabled:opacity-50 sm:w-52"
                  >
                    <option value="">Tidak diaktifkan</option>
                    {NUMPAD_DIGITS.map((digit) => {
                      const used = MENU_POSITIONS.some((other) => other !== position && selected[other] === String(digit));
                      return <option key={digit} value={digit} disabled={used}>Numpad {digit}{used ? " — sudah dipakai" : ""}</option>;
                    })}
                  </select>
                </div>
              ))}
            </div>
          <div className="border-t border-slate-200 p-6">
            <p className="mb-4 text-sm leading-6 text-slate-500">
              Urutan kartu dibaca dari kiri ke kanan, lalu baris berikutnya. Menu terbaru tampil di awal.
              Kamu bisa mengatur semua posisi meskipun belum ada menu. Posisi yang kosong tidak menjalankan Take.
              Angka pada baris atas keyboard tidak menjalankan Take. Pintasan dijeda saat mengisi formulir atau membuka dialog.
            </p>
            <Button type="submit">{isPending ? "Menyimpan..." : "Simpan Key Map"}</Button>
          </div>
        </fieldset>
        {feedback ? (
          <p role={feedback.success ? "status" : "alert"} className={`mx-6 mb-6 rounded-md p-3 text-sm ${feedback.success ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
            {feedback.message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
