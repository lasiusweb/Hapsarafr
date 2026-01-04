// hooks/useAppState.ts
import { useState, useCallback } from 'react';

interface UseAppStateResult {
  printQueue: string[];
  setPrintQueue: React.Dispatch<React.SetStateAction<string[]>>;
  newlyAddedFarmerId: string | null;
  setNewlyAddedFarmerId: React.Dispatch<React.SetStateAction<string | null>>;
  appContent: any; // Consider a more specific type if possible
  setAppContent: React.Dispatch<React.SetStateAction<any>>;
  onHighlightComplete: () => void; // Helper for newlyAddedFarmerId
  onClearPrintQueue: () => void; // Helper for printQueue
}

export const useAppState = (): UseAppStateResult => {
  const [printQueue, setPrintQueue] = useState<string[]>([]);
  const [newlyAddedFarmerId, setNewlyAddedFarmerId] = useState<string | null>(null);
  const [appContent, setAppContent] = useState<any>(null); // This might need a proper type

  const onHighlightComplete = useCallback(() => setNewlyAddedFarmerId(null), []);
  const onClearPrintQueue = useCallback(() => setPrintQueue([]), []);

  return {
    printQueue,
    setPrintQueue,
    newlyAddedFarmerId,
    setNewlyAddedFarmerId,
    appContent,
    setAppContent,
    onHighlightComplete,
    onClearPrintQueue,
  };
};