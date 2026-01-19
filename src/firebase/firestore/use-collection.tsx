'use client';
import { useState, useEffect, useMemo } from 'react';
import { onSnapshot, Query, DocumentData } from 'firebase/firestore';

export function useCollection<T extends DocumentData>(
  query: Query<T> | null | undefined
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Memoize the path to prevent re-renders if the query object is recreated
  const queryPath = useMemo(() => query?.toString(), [query]);

  useEffect(() => {
    if (!query) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = onSnapshot(
      query,
      (querySnapshot) => {
        const items = querySnapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        } as T));
        setData(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [queryPath]); // Use the memoized path as dependency

  return { data, loading, error };
}
