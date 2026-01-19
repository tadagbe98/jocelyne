'use client';
import { useState, useEffect, useMemo } from 'react';
import { onSnapshot, DocumentData, DocumentReference } from 'firebase/firestore';

export function useDoc<T extends DocumentData>(
  ref: DocumentReference<T> | null | undefined
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const refPath = useMemo(() => ref?.path, [ref]);

  useEffect(() => {
    if (!ref) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = onSnapshot(
      ref,
      (docSnap) => {
        if (docSnap.exists()) {
          setData({ ...docSnap.data(), id: docSnap.id } as T);
        } else {
          setData(null);
        }
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
  }, [refPath]);

  return { data, loading, error };
}
