/**
 * Offline persistence layer for SiteDiary
 * Uses IndexedDB to queue mutations when offline and sync when restored
 */

import type { AddEquipmentPayload, AddLaborPayload, CreateDiaryPayload, UpdateDiaryPayload } from "./types";

const DB_NAME = "site-diary-offline";
const DB_VERSION = 1;
const QUEUE_STORE = "mutation-queue";
const DRAFT_STORE = "draft-diaries";

/** Types of mutations that can be queued */
export type MutationType =
  | "create-diary"
  | "update-diary"
  | "add-labor"
  | "delete-labor"
  | "add-equipment"
  | "delete-equipment"
  | "upload-photo";

/** A queued mutation action */
export interface QueuedMutation {
  id: string;
  type: MutationType;
  payload: unknown;
  timestamp: string;
  retryCount: number;
  error?: string;
}

/** Draft diary stored locally */
export interface DraftDiary {
  id: string; // client-generated UUID
  companyId: string;
  date: string;
  payload: CreateDiaryPayload;
  labor: AddLaborPayload[];
  equipment: AddEquipmentPayload[];
  notes: string | null;
  weather: {
    conditions: string;
    temp_min: number | null;
    temp_max: number | null;
    wind: string | null;
  };
  photos: { file: Blob; caption: string | null }[];
  createdAt: string;
  updatedAt: string;
  submitted: boolean;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Store for queued mutations
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const queueStore = db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
        queueStore.createIndex("timestamp", "timestamp", { unique: false });
        queueStore.createIndex("type", "type", { unique: false });
      }

      // Store for draft diaries
      if (!db.objectStoreNames.contains(DRAFT_STORE)) {
        const draftStore = db.createObjectStore(DRAFT_STORE, { keyPath: "id" });
        draftStore.createIndex("companyId", "companyId", { unique: false });
        draftStore.createIndex("date", "date", { unique: false });
        draftStore.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };
  });

  return dbPromise;
}

// ─────────────────────────────────────────────
// Connectivity Detection
// ─────────────────────────────────────────────

let isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
const connectivityListeners = new Set<(online: boolean) => void>();

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    isOnline = true;
    connectivityListeners.forEach((cb) => cb(true));
    // Trigger sync when back online
    void processQueue();
  });

  window.addEventListener("offline", () => {
    isOnline = false;
    connectivityListeners.forEach((cb) => cb(false));
  });
}

export function getConnectivityStatus(): boolean {
  return isOnline;
}

export function onConnectivityChange(callback: (online: boolean) => void): () => void {
  connectivityListeners.add(callback);
  return () => connectivityListeners.delete(callback);
}

// ─────────────────────────────────────────────
// Mutation Queue
// ─────────────────────────────────────────────

export async function queueMutation(
  type: MutationType,
  payload: unknown
): Promise<QueuedMutation> {
  const mutation: QueuedMutation = {
    id: crypto.randomUUID(),
    type,
    payload,
    timestamp: new Date().toISOString(),
    retryCount: 0,
  };

  const db = await getDB();
  const tx = db.transaction(QUEUE_STORE, "readwrite");
  const store = tx.objectStore(QUEUE_STORE);
  await promisifyRequest(store.put(mutation));

  return mutation;
}

export async function getQueuedMutations(): Promise<QueuedMutation[]> {
  const db = await getDB();
  const tx = db.transaction(QUEUE_STORE, "readonly");
  const store = tx.objectStore(QUEUE_STORE);
  const index = store.index("timestamp");
  return promisifyRequest(index.getAll()) as Promise<QueuedMutation[]>;
}

export async function removeQueuedMutation(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(QUEUE_STORE, "readwrite");
  const store = tx.objectStore(QUEUE_STORE);
  await promisifyRequest(store.delete(id));
}

export async function updateMutationError(id: string, error: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(QUEUE_STORE, "readwrite");
  const store = tx.objectStore(QUEUE_STORE);
  const mutation = await promisifyRequest(store.get(id)) as QueuedMutation | undefined;
  if (mutation) {
    mutation.error = error;
    mutation.retryCount++;
    await promisifyRequest(store.put(mutation));
  }
}

export async function clearMutationQueue(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(QUEUE_STORE, "readwrite");
  const store = tx.objectStore(QUEUE_STORE);
  await promisifyRequest(store.clear());
}

// ─────────────────────────────────────────────
// Draft Diaries
// ─────────────────────────────────────────────

export async function saveDraft(draft: DraftDiary): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(DRAFT_STORE, "readwrite");
  const store = tx.objectStore(DRAFT_STORE);
  draft.updatedAt = new Date().toISOString();
  await promisifyRequest(store.put(draft));
}

export async function getDraft(id: string): Promise<DraftDiary | null> {
  const db = await getDB();
  const tx = db.transaction(DRAFT_STORE, "readonly");
  const store = tx.objectStore(DRAFT_STORE);
  const result = await promisifyRequest(store.get(id)) as DraftDiary | undefined;
  return result ?? null;
}

export async function getDraftsByCompany(companyId: string): Promise<DraftDiary[]> {
  const db = await getDB();
  const tx = db.transaction(DRAFT_STORE, "readonly");
  const store = tx.objectStore(DRAFT_STORE);
  const index = store.index("companyId");
  return promisifyRequest(index.getAll(companyId)) as Promise<DraftDiary[]>;
}

export async function getDraftForDate(companyId: string, date: string): Promise<DraftDiary | null> {
  const drafts = await getDraftsByCompany(companyId);
  return drafts.find((d) => d.date === date && !d.submitted) ?? null;
}

export async function deleteDraft(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(DRAFT_STORE, "readwrite");
  const store = tx.objectStore(DRAFT_STORE);
  await promisifyRequest(store.delete(id));
}

export async function getAllDrafts(): Promise<DraftDiary[]> {
  const db = await getDB();
  const tx = db.transaction(DRAFT_STORE, "readonly");
  const store = tx.objectStore(DRAFT_STORE);
  const index = store.index("updatedAt");
  return promisifyRequest(index.getAll()) as Promise<DraftDiary[]>;
}

// ─────────────────────────────────────────────
// Queue Processing
// ─────────────────────────────────────────────

import {
  createDiary,
  updateDiary,
  addLabor,
  deleteLabor,
  addEquipment,
  deleteEquipment,
  uploadPhoto,
} from "./client";

/** Process the mutation queue - call when back online */
export async function processQueue(): Promise<{
  processed: number;
  failed: number;
  errors: Array<{ id: string; type: MutationType; error: string }>;
}> {
  if (!isOnline) {
    return { processed: 0, failed: 0, errors: [] };
  }

  const mutations = await getQueuedMutations();
  const errors: Array<{ id: string; type: MutationType; error: string }> = [];
  let processed = 0;
  let failed = 0;

  for (const mutation of mutations) {
    // Skip mutations that have failed too many times
    if (mutation.retryCount >= 3) {
      failed++;
      errors.push({ id: mutation.id, type: mutation.type, error: mutation.error || "Max retries exceeded" });
      continue;
    }

    try {
      await executeMutation(mutation);
      await removeQueuedMutation(mutation.id);
      processed++;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await updateMutationError(mutation.id, errorMsg);
      failed++;
      errors.push({ id: mutation.id, type: mutation.type, error: errorMsg });
    }
  }

  return { processed, failed, errors };
}

async function executeMutation(mutation: QueuedMutation): Promise<void> {
  switch (mutation.type) {
    case "create-diary": {
      const payload = mutation.payload as CreateDiaryPayload;
      await createDiary(payload);
      break;
    }
    case "update-diary": {
      const { id, payload } = mutation.payload as { id: string; payload: UpdateDiaryPayload };
      await updateDiary(id, payload);
      break;
    }
    case "add-labor": {
      const { diaryId, payload } = mutation.payload as { diaryId: string; payload: AddLaborPayload };
      await addLabor(diaryId, payload);
      break;
    }
    case "delete-labor": {
      const laborId = mutation.payload as string;
      await deleteLabor(laborId);
      break;
    }
    case "add-equipment": {
      const { diaryId, payload } = mutation.payload as { diaryId: string; payload: AddEquipmentPayload };
      await addEquipment(diaryId, payload);
      break;
    }
    case "delete-equipment": {
      const equipmentId = mutation.payload as string;
      await deleteEquipment(equipmentId);
      break;
    }
    case "upload-photo": {
      const { diaryId, file, caption } = mutation.payload as {
        diaryId: string;
        file: File;
        caption?: string | null;
      };
      await uploadPhoto(diaryId, file, caption);
      break;
    }
    default:
      throw new Error(`Unknown mutation type: ${mutation.type}`);
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
