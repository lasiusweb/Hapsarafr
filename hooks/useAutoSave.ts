import { useEffect, useRef, useCallback } from 'react';
import { FarmerFormData } from '../lib/schemas/farmerSchema';

const DRAFT_KEY_PREFIX = 'farmer_draft_';

interface UseAutoSaveOptions {
  userId: string;
  interval?: number;
  onSave?: (data: FarmerFormData) => void;
}

export function useAutoSave({ userId, interval = 30000, onSave }: UseAutoSaveOptions) {
  const draftKey = `${DRAFT_KEY_PREFIX}${userId}`;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const saveDraft = useCallback(
    (data: FarmerFormData) => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ data, savedAt: Date.now() }));
        onSave?.(data);
      } catch (error) {
        console.error('Failed to save draft:', error);
      }
    },
    [draftKey, onSave]
  );

  const loadDraft = useCallback((): { data: FarmerFormData; savedAt: number } | null => {
    try {
      const stored = localStorage.getItem(draftKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
    return null;
  }, [draftKey]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftKey);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  }, [draftKey]);

  const startAutoSave = useCallback(
    (data: FarmerFormData) => {
      stopAutoSave();
      timerRef.current = setInterval(() => {
        saveDraft(data);
      }, interval);
    },
    [interval, saveDraft]
  );

  const stopAutoSave = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopAutoSave();
  }, [stopAutoSave]);

  return {
    saveDraft,
    loadDraft,
    clearDraft,
    startAutoSave,
    stopAutoSave,
  };
}