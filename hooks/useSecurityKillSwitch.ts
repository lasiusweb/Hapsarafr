// hooks/useSecurityKillSwitch.ts
import { useEffect } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useLocation } from 'react-router-dom';

export const useSecurityKillSwitch = () => {
  const database = useDatabase();
  const location = useLocation();

  useEffect(() => {
    const checkSecurity = async () => {
      const lastActiveStr = localStorage.getItem('hapsara_last_active');
      const now = Date.now();
      const MAX_INACTIVITY = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

      if (lastActiveStr) {
        const lastActive = parseInt(lastActiveStr, 10);
        if (now - lastActive > MAX_INACTIVITY) {
          try {
            await database.write(async () => { await database.unsafeResetDatabase(); });
            localStorage.clear();
            alert("Session expired. Data wiped for security.");
            window.location.reload();
          } catch (e) {
            console.error("Error during security kill switch action:", e);
          }
          return;
        }
      }
      localStorage.setItem('hapsara_last_active', now.toString());
    };
    checkSecurity();
  }, [database, location]); // Re-run on database or location changes
};
