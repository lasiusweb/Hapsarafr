import React, { createContext, useContext } from 'react';
import { Database } from '@nozbe/watermelondb';
// FIX: Import from the newly created db/index.ts file
import database from './db';

const DatabaseContext = createContext<Database>(database);

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <DatabaseContext.Provider value={database}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = (): Database => {
  return useContext(DatabaseContext);
};