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
      <div className="flex flex-col flex-1 min-h-screen">
        <header className="sticky top-0 z-10 w-full border-b bg-background">
          <div className="flex items-center h-16 px-4 mx-auto max-w-7xl md:px-6">
            <div className="items-center hidden gap-6 mr-6 md:flex">
                <Skeleton className="w-24 h-6" />
                <div className="flex items-center space-x-4 lg:space-x-6">
                    <Skeleton className="w-20 h-4" />
                    <Skeleton className="w-16 h-4" />
                    <Skeleton className="w-24 h-4" />
                </div>
            </div>
            <div className="flex items-center w-full gap-4 md:ml-auto md:w-auto md:gap-2 lg:gap-4">
                <div className="flex-1 ml-auto sm:flex-initial" />
                <Skeleton className="w-10 h-10 rounded-full" />
            </div>
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
