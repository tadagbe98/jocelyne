'use client';
import { useState, useEffect, useMemo } from 'react';
import { onSnapshot, Query, DocumentData } from 'firebase/firestore';

export function useCollection<T extends DocumentData>(
  query: Query<T> | null | undefined
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const queryPath = useMemo(() => {
    if (!query) return null;
    // A simplified way to create a stable key from a query
    return `${query.path}_${JSON.stringify(query._query.filters)}_${JSON.stringify(query._query.orderBy)}_${query._query.limit}`;
  }, [query]);


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
  }, [queryPath]); // Depend on the stable query path

  return { data, loading, error };
}
