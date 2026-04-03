"use client";

/**
 * Hook for offline-aware SiteCapture operations
 * Automatically queues mutations when offline and syncs when restored
 */

import { useCallback, useEffect, useState } from "react";
import {
  queueMutation,
  getQueuedMutations,
  processQueue,
  getConnectivityStatus,
  onConnectivityChange,
  saveDraft,
  getDraft,
  getDraftForDate,
  deleteDraft,
  type DraftDiary,
  type MutationType,
} from "@/lib/site-capture/offline";
import type {
  AddEquipmentPayload,
  AddLaborPayload,
  CreateDiaryPayload,
  UpdateDiaryPayload,
} from "@/lib/site-capture/types";

export interface OfflineStatus {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncAt: string | null;
  syncErrors: Array<{ id: string; type: MutationType; error: string }>;
}

export function useOfflineDiary(companyId: string) {
  const [status, setStatus] = useState<OfflineStatus>({
    isOnline: getConnectivityStatus(),
    pendingCount: 0,
    isSyncing: false,
    lastSyncAt: null,
    syncErrors: [],
  });

  const refreshQueueCount = useCallback(async () => {
    const mutations = await getQueuedMutations();
    setStatus((prev) => ({ ...prev, pendingCount: mutations.length }));
  }, []);

  const sync = useCallback(async () => {
    if (!getConnectivityStatus()) return;

    setStatus((prev) => ({ ...prev, isSyncing: true }));
    try {
      const result = await processQueue();
      setStatus((prev) => ({
        ...prev,
        pendingCount: prev.pendingCount - result.processed,
        lastSyncAt: new Date().toISOString(),
        syncErrors: result.errors,
      }));
    } finally {
      setStatus((prev) => ({ ...prev, isSyncing: false }));
    }
  }, []);

  // Track connectivity changes
  useEffect(() => {
    const unsubscribe = onConnectivityChange((online) => {
      setStatus((prev) => ({ ...prev, isOnline: online }));
      if (online) {
        // Auto-sync when coming back online
        void sync();
      }
    });

    // Initial queue count
    void refreshQueueCount();

    return unsubscribe;
  }, [refreshQueueCount, sync]);

  // ─────────────────────────────────────────────
  // Queue Operations
  // ─────────────────────────────────────────────

  const queueCreateDiary = useCallback(
    async (payload: CreateDiaryPayload): Promise<{ queued: boolean; mutationId: string }> => {
      const mutation = await queueMutation("create-diary", payload);
      await refreshQueueCount();
      if (getConnectivityStatus()) {
        void sync();
      }
      return { queued: true, mutationId: mutation.id };
    },
    [refreshQueueCount, sync]
  );

  const queueUpdateDiary = useCallback(
    async (id: string, payload: UpdateDiaryPayload): Promise<{ queued: boolean; mutationId: string }> => {
      const mutation = await queueMutation("update-diary", { id, payload });
      await refreshQueueCount();
      if (getConnectivityStatus()) {
        void sync();
      }
      return { queued: true, mutationId: mutation.id };
    },
    [refreshQueueCount, sync]
  );

  const queueAddLabor = useCallback(
    async (diaryId: string, payload: AddLaborPayload): Promise<{ queued: boolean; mutationId: string }> => {
      const mutation = await queueMutation("add-labor", { diaryId, payload });
      await refreshQueueCount();
      if (getConnectivityStatus()) {
        void sync();
      }
      return { queued: true, mutationId: mutation.id };
    },
    [refreshQueueCount, sync]
  );

  const queueDeleteLabor = useCallback(
    async (laborId: string): Promise<{ queued: boolean; mutationId: string }> => {
      const mutation = await queueMutation("delete-labor", laborId);
      await refreshQueueCount();
      if (getConnectivityStatus()) {
        void sync();
      }
      return { queued: true, mutationId: mutation.id };
    },
    [refreshQueueCount, sync]
  );

  const queueAddEquipment = useCallback(
    async (diaryId: string, payload: AddEquipmentPayload): Promise<{ queued: boolean; mutationId: string }> => {
      const mutation = await queueMutation("add-equipment", { diaryId, payload });
      await refreshQueueCount();
      if (getConnectivityStatus()) {
        void sync();
      }
      return { queued: true, mutationId: mutation.id };
    },
    [refreshQueueCount, sync]
  );

  const queueDeleteEquipment = useCallback(
    async (equipmentId: string): Promise<{ queued: boolean; mutationId: string }> => {
      const mutation = await queueMutation("delete-equipment", equipmentId);
      await refreshQueueCount();
      if (getConnectivityStatus()) {
        void sync();
      }
      return { queued: true, mutationId: mutation.id };
    },
    [refreshQueueCount, sync]
  );

  // ─────────────────────────────────────────────
  // Draft Operations
  // ─────────────────────────────────────────────

  const saveLocalDraft = useCallback(
    async (draft: DraftDiary): Promise<void> => {
      await saveDraft(draft);
    },
    []
  );

  const loadDraft = useCallback(async (id: string): Promise<DraftDiary | null> => {
    return getDraft(id);
  }, []);

  const loadDraftForToday = useCallback(async (): Promise<DraftDiary | null> => {
    const today = new Date().toISOString().slice(0, 10);
    return getDraftForDate(companyId, today);
  }, [companyId]);

  const removeDraft = useCallback(async (id: string): Promise<void> => {
    await deleteDraft(id);
  }, []);

  return {
    // Status
    isOnline: status.isOnline,
    pendingCount: status.pendingCount,
    isSyncing: status.isSyncing,
    lastSyncAt: status.lastSyncAt,
    syncErrors: status.syncErrors,

    // Actions
    sync,
    refreshQueueCount,

    // Queue operations
    queueCreateDiary,
    queueUpdateDiary,
    queueAddLabor,
    queueDeleteLabor,
    queueAddEquipment,
    queueDeleteEquipment,

    // Draft operations
    saveLocalDraft,
    loadDraft,
    loadDraftForToday,
    removeDraft,
  };
}
