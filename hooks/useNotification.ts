// hooks/useNotification.ts
import { useState, useCallback } from 'react';

interface NotificationState {
  message: string;
  type: 'success' | 'error' | 'info';
}

interface UseNotificationResult {
  notification: NotificationState | null;
  setNotification: (notification: NotificationState | null) => void;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  dismissNotification: () => void;
}

export const useNotification = (): UseNotificationResult => {
  const [notification, setNotification] = useState<NotificationState | null>(null);

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message, type });
  }, []);

  const dismissNotification = useCallback(() => {
    setNotification(null);
  }, []);

  return {
    notification,
    setNotification, // Keeping this if external setting is needed
    showNotification,
    dismissNotification,
  };
};