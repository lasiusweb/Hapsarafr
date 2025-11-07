import { useState, useEffect } from 'react';
import { Model, Query } from '@nozbe/watermelondb';

export const useQuery = <T extends Model>(query: Query<T>): T[] => {
  const [data, setData] = useState<T[]>([]);
  useEffect(() => {
    const subscription = query.observe().subscribe(setData);
    return () => subscription.unsubscribe();
  }, [query]);
  return data;
};
