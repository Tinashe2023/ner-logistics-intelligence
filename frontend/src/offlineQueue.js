const DATABASE_NAME = "ner-logistics-field-queue";
const STORE_NAME = "reports";
const LEGACY_STORAGE_KEY = "ner-logistics-offline-reports";

function openQueueDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    let settled = false;
    const timeout = window.setTimeout(() => {
      settled = true;
      reject(new Error("Opening offline report storage timed out"));
    }, 5000);
    request.onblocked = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      reject(new Error("Offline report storage is blocked by another open tab"));
    };
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: "localId" });
    };
    request.onsuccess = () => {
      if (settled) {
        request.result.close();
        return;
      }
      settled = true;
      window.clearTimeout(timeout);
      resolve(request.result);
    };
    request.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      reject(request.error || new Error("Could not open offline report storage"));
    };
  });
}

function transact(mode, operation) {
  return openQueueDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const timeout = window.setTimeout(() => {
      try { transaction.abort(); } catch { /* transaction may already be complete */ }
    }, 5000);
    let result;
    try {
      result = operation(store);
    } catch (error) {
      database.close();
      reject(error);
      return;
    }
    transaction.oncomplete = () => {
      window.clearTimeout(timeout);
      database.close();
      resolve(result?.result);
    };
    transaction.onerror = () => {
      window.clearTimeout(timeout);
      database.close();
      reject(transaction.error || new Error("Offline report storage failed"));
    };
    transaction.onabort = () => {
      window.clearTimeout(timeout);
      database.close();
      reject(transaction.error || new Error("Offline report storage was interrupted"));
    };
  }));
}

export async function readQueuedReports() {
  const stored = await transact("readonly", (store) => store.getAll());
  let legacy = [];
  try {
    legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || "[]");
  } catch {
    legacy = [];
  }

  if (Array.isArray(legacy) && legacy.length) {
    const byId = new Map((stored || []).map((report) => [report.localId, report]));
    for (const report of legacy) {
      if (report?.localId && !byId.has(report.localId)) {
        byId.set(report.localId, { ...report, photos: report.photos || [] });
      }
    }
    const merged = [...byId.values()];
    await replaceQueuedReports(merged);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return merged;
  }
  return stored || [];
}

export function replaceQueuedReports(reports) {
  return transact("readwrite", (store) => {
    store.clear();
    for (const report of reports) store.put(report);
  });
}
