export type TakeMenuResult =
  | { success: true; qty: number }
  | { success: false; message: string };

type MenuStock = { id: string; qty: number };

export type TakeState = {
  qty: number;
  pending: number;
  error: string;
  needsRefresh: boolean;
};

type QueueEntry = {
  confirmedQty: number;
  pending: number;
  running: boolean;
  error: string;
  needsRefresh: boolean;
};

type Snapshot = { items: Record<string, TakeState>; pending: number };

// Shared by all views of the dashboard. Pending includes the in-flight request.
// Each menu has one writer. Failed/uncertain writes are never retried automatically.
export class TakeQueue {
  private entries = new Map<string, QueueEntry>();
  private listeners = new Set<() => void>();
  private snapshot: Snapshot = { items: {}, pending: 0 };
  private send: (id: string) => Promise<TakeMenuResult>;

  constructor(items: MenuStock[], send: (id: string) => Promise<TakeMenuResult>) {
    this.send = send;
    this.syncItems(items);
  }

  getSnapshot = () => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  syncItems(items: MenuStock[]) {
    const ids = new Set(items.map((item) => item.id));
    for (const [id, entry] of this.entries) {
      if (!ids.has(id) && !entry.running) this.entries.delete(id);
    }
    for (const item of items) {
      const entry = this.entries.get(item.id);
      if (!entry) {
        this.entries.set(item.id, {
          confirmedQty: item.qty, pending: 0, running: false, error: "", needsRefresh: false,
        });
      } else if (!entry.running && !entry.needsRefresh) {
        entry.confirmedQty = item.qty;
      }
    }
    this.publish();
  }

  take = (id: string) => {
    const entry = this.entries.get(id);
    if (!entry || entry.needsRefresh || entry.confirmedQty - entry.pending <= 0) return false;

    entry.pending += 1;
    entry.error = "";
    this.publish();
    void this.drain(id, entry);
    return true;
  };

  private publish() {
    const items: Record<string, TakeState> = {};
    let pending = 0;
    for (const [id, entry] of this.entries) {
      items[id] = {
        qty: Math.max(0, entry.confirmedQty - entry.pending),
        pending: entry.pending,
        error: entry.error,
        needsRefresh: entry.needsRefresh,
      };
      pending += entry.pending;
    }
    this.snapshot = { items, pending };
    this.listeners.forEach((listener) => listener());
  }

  private async drain(id: string, entry: QueueEntry) {
    if (entry.running) return;
    entry.running = true;
    try {
      while (entry.pending > 0) {
        const result = await this.send(id);
        if (!result.success) {
          this.stopAfterError(entry, result.message);
          break;
        }
        if (!Number.isSafeInteger(result.qty) || result.qty < 0) {
          throw new Error("Invalid stock response");
        }

        entry.confirmedQty = result.qty;
        entry.pending -= 1;

        // Another device may have taken the remaining stock while we were saving.
        if (entry.pending > result.qty) {
          const cancelled = entry.pending - result.qty;
          entry.pending = result.qty;
          entry.error = `Stok berubah. ${cancelled} pengambilan berikutnya dibatalkan karena stok habis.`;
        }
        this.publish();
      }
    } catch {
      // A lost response may already have committed. Never retry automatically.
      this.stopAfterError(entry, "Status pengambilan terakhir belum dapat dipastikan.");
    } finally {
      entry.running = false;
      this.publish();
    }
  }

  private stopAfterError(entry: QueueEntry, message: string) {
    const cancelled = Math.max(0, entry.pending - 1);
    entry.pending = 0;
    entry.needsRefresh = true;
    entry.error = `${message}${cancelled ? ` ${cancelled} pengambilan berikutnya dibatalkan.` : ""} Muat ulang stok sebelum melanjutkan.`;
  }
}
