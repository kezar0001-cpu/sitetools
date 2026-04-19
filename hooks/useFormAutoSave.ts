"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface DraftMetadata {
  key: string;
  savedAt: string;
  formType: string;
  userId: string;
  diaryId?: string;
}

interface UseFormAutoSaveOptions<T> {
  key: string;
  formType: string;
  userId: string | null;
  diaryId?: string;
  values: T;
  enabled?: boolean;
  intervalMs?: number;
  onDraftRestored?: (draft: T) => void;
}

interface UseFormAutoSaveReturn<T> {
  hasDraft: boolean;
  draftTimestamp: string | null;
  restoreDraft: () => T | null;
  clearDraft: () => void;
  dismissDraft: () => void;
  showRecoveryDialog: boolean;
  lastSavedAt: string | null;
  isDirty: boolean;
}

const STORAGE_PREFIX = "buildstate:draft:";
const METADATA_KEY = "buildstate:draft:metadata";

export function useFormAutoSave<T extends Record<string, unknown>>(
  options: UseFormAutoSaveOptions<T>
): UseFormAutoSaveReturn<T> {
  const {
    key,
    formType,
    userId,
    diaryId,
    values,
    enabled = true,
    intervalMs = 30000, // 30 seconds
    onDraftRestored,
  } = options;

  const [hasDraft, setHasDraft] = useState(false);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [draftTimestamp, setDraftTimestamp] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const valuesRef = useRef(values);
  const lastSavedValuesRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Build the full storage key
  const storageKey = userId
    ? `${STORAGE_PREFIX}${userId}:${formType}:${key}`
    : null;

  // Check for existing draft on mount
  useEffect(() => {
    if (!storageKey || !enabled) return;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const draft = JSON.parse(saved) as { data: T; savedAt: string };
        setHasDraft(true);
        setDraftTimestamp(draft.savedAt);
        setShowRecoveryDialog(true);

        if (onDraftRestored) {
          onDraftRestored(draft.data);
        }
      }
    } catch (err) {
      console.error("[useFormAutoSave] Error checking for draft:", err);
    }
  }, [storageKey, enabled, onDraftRestored]);

  // Update values ref when values change
  useEffect(() => {
    valuesRef.current = values;

    // Check if values are different from last saved
    const currentValuesJson = JSON.stringify(values);
    const isDifferent = currentValuesJson !== lastSavedValuesRef.current;
    setIsDirty(isDifferent && Object.keys(values).length > 0);
  }, [values]);

  // Auto-save interval
  useEffect(() => {
    if (!storageKey || !enabled || !userId) return;

    const saveDraft = () => {
      if (!isDirty) return;

      try {
        const draft = {
          data: valuesRef.current,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(storageKey, JSON.stringify(draft));
        lastSavedValuesRef.current = JSON.stringify(valuesRef.current);
        setLastSavedAt(draft.savedAt);
        setIsDirty(false);

        // Update metadata index
        updateMetadata(storageKey, {
          key,
          savedAt: draft.savedAt,
          formType,
          userId,
          diaryId,
        });
      } catch (err) {
        console.error("[useFormAutoSave] Error saving draft:", err);
      }
    };

    intervalRef.current = setInterval(saveDraft, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [storageKey, enabled, userId, intervalMs, isDirty, key, formType, diaryId]);

  // Save on beforeunload if dirty
  useEffect(() => {
    if (!storageKey || !enabled || !userId) return;

    const handleBeforeUnload = () => {
      if (isDirty) {
        try {
          const draft = {
            data: valuesRef.current,
            savedAt: new Date().toISOString(),
          };
          localStorage.setItem(storageKey, JSON.stringify(draft));
        } catch (err) {
          console.error("[useFormAutoSave] Error saving draft on unload:", err);
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [storageKey, enabled, userId, isDirty]);

  const restoreDraft = useCallback((): T | null => {
    if (!storageKey) return null;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const draft = JSON.parse(saved) as { data: T; savedAt: string };
        setShowRecoveryDialog(false);
        setHasDraft(false);
        lastSavedValuesRef.current = JSON.stringify(draft.data);
        return draft.data;
      }
    } catch (err) {
      console.error("[useFormAutoSave] Error restoring draft:", err);
    }
    return null;
  }, [storageKey]);

  const clearDraft = useCallback(() => {
    if (!storageKey) return;

    try {
      localStorage.removeItem(storageKey);
      removeFromMetadata(storageKey);
      setHasDraft(false);
      setDraftTimestamp(null);
      setLastSavedAt(null);
      lastSavedValuesRef.current = null;
      setIsDirty(false);
    } catch (err) {
      console.error("[useFormAutoSave] Error clearing draft:", err);
    }
  }, [storageKey]);

  const dismissDraft = useCallback(() => {
    setShowRecoveryDialog(false);
  }, []);

  return {
    hasDraft,
    draftTimestamp,
    restoreDraft,
    clearDraft,
    dismissDraft,
    showRecoveryDialog,
    lastSavedAt,
    isDirty,
  };
}

// Helper to maintain an index of all drafts
function updateMetadata(storageKey: string, metadata: DraftMetadata): void {
  try {
    const existing = localStorage.getItem(METADATA_KEY);
    const allMetadata: Record<string, DraftMetadata> = existing
      ? JSON.parse(existing)
      : {};
    allMetadata[storageKey] = metadata;
    localStorage.setItem(METADATA_KEY, JSON.stringify(allMetadata));
  } catch {
    // Ignore metadata errors - not critical
  }
}

function removeFromMetadata(storageKey: string): void {
  try {
    const existing = localStorage.getItem(METADATA_KEY);
    if (!existing) return;
    const allMetadata: Record<string, DraftMetadata> = JSON.parse(existing);
    delete allMetadata[storageKey];
    localStorage.setItem(METADATA_KEY, JSON.stringify(allMetadata));
  } catch {
    // Ignore metadata errors - not critical
  }
}

// Utility to check if a draft exists for a given key
export function hasDraft(userId: string, formType: string, key: string): boolean {
  if (typeof window === "undefined") return false;
  const storageKey = `${STORAGE_PREFIX}${userId}:${formType}:${key}`;
  try {
    return localStorage.getItem(storageKey) !== null;
  } catch {
    return false;
  }
}

// Utility to get all drafts for a user
export function getUserDrafts(userId: string): Array<{ formType: string; key: string; savedAt: string }> {
  if (typeof window === "undefined") return [];
  try {
    const existing = localStorage.getItem(METADATA_KEY);
    if (!existing) return [];
    const allMetadata: Record<string, DraftMetadata> = JSON.parse(existing);
    return Object.values(allMetadata)
      .filter((m) => m.userId === userId)
      .map((m) => ({
        formType: m.formType,
        key: m.key,
        savedAt: m.savedAt,
      }));
  } catch {
    return [];
  }
}
