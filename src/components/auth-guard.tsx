'use client';

import { useUser } from '@/firebase/auth/use-user';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from './ui/skeleton';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();

  useEffect(() => {
    if (!loading && !user) {
      redirect('/login');
    }
  }, [user, loading]);

  if (loading || !user) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-10 w-full border-b bg-background">
          <div className="flex items-center justify-between h-16 px-4 mx-auto max-w-7xl md:px-6">
            <Skeleton className="w-24 h-8" />
            <Skeleton className="w-10 h-10 rounded-full" />
          </div>
        </header>
        <main className="flex-1 w-full p-4 mx-auto max-w-7xl sm:p-6 lg:p-8">
          <Skeleton className="w-1/2 h-10 mb-8" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        </main>
      </div>
    );
  }

  return <>{children}</>;
}
