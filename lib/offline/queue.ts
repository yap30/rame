// ============================================================
// RAME — antrean offline scanner (IndexedDB, client-side)
// Scanner menyimpan transaksi verifikasi saat luring, lalu
// disinkronkan via POST /api/scanner/sync (blueprint §8).
// ============================================================

export interface OfflineTx {
  id: string;
  payload: string; // QR payload mentah
  scannedAt: number;
  deviceCode: string;
  synced: boolean;
}

const DB_NAME = "rame-offline";
const STORE = "pending";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB tidak tersedia"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueOffline(tx: Omit<OfflineTx, "synced">): Promise<void> {
  await withStore("readwrite", (store) => store.put({ ...tx, synced: false }));
}

export async function listPending(): Promise<OfflineTx[]> {
  try {
    return (await withStore("readonly", (store) => store.getAll())) as OfflineTx[];
  } catch {
    return [];
  }
}

export async function markSynced(id: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(id));
}

export async function clearQueue(): Promise<void> {
  try {
    await withStore("readwrite", (store) => store.clear());
  } catch {
    // abaikan
  }
}

export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}
