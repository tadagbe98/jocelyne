'use client';

import Logo from "@/components/logo";
import { MainNav } from "@/components/main-nav";
import { UserNav } from "@/components/user-nav";
import AuthGuard from "@/components/auth-guard";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useUser } from "@/firebase/auth/use-user";
import { useFirestore } from "@/firebase/provider";
import { useDoc } from "@/firebase/firestore/use-doc";
import React, { useMemo } from 'react';
import { doc, DocumentReference } from 'firebase/firestore';
import { Company } from '@/lib/types';
import Image from "next/image";
import { Skeleton } from '@/components/ui/skeleton';


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { userProfile } = useUser();
  const firestore = useFirestore();

  const companyRef = useMemo(() => {
    if (!userProfile?.companyId) return null;
    return doc(firestore, 'companies', userProfile.companyId) as DocumentReference<Company>;
  }, [firestore, userProfile?.companyId]);
  
  const { data: company, loading: companyLoading } = useDoc<Company>(companyRef);

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-10 w-full border-b bg-background">
            <div className="flex items-center h-16 px-4 mx-auto max-w-7xl md:px-6">

                {/* Desktop Navigation */}
                <div className="items-center hidden gap-6 mr-6 md:flex">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <Logo className="w-6 h-6" />
                        <span className="font-bold">Projexia</span>
                    </Link>
                    <MainNav />
                </div>
                
                {/* Mobile Navigation */}
                <Sheet>
                    <SheetTrigger asChild>
                    <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0 md:hidden"
                    >
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle navigation menu</span>
                    </Button>
                    </SheetTrigger>
                    <SheetContent side="left">
                        <nav className="grid gap-6 text-lg font-medium">
                            <Link href="/dashboard" className="flex items-center gap-2 mb-4 text-lg font-semibold">
                                <Logo className="w-6 h-6" />
                                <span>Projexia</span>
                            </Link>
                            <MainNav isMobile />
                        </nav>
                    </SheetContent>
                </Sheet>

                {/* Right side of header */}
                <div className="flex items-center w-full gap-4 md:ml-auto md:w-auto md:gap-2 lg:gap-4">
                    <div className="flex-1 ml-auto sm:flex-initial" />
                    <UserNav company={company} companyLoading={companyLoading} />
                </div>
            </div>
        </header>
        <main className="flex-1 w-full p-4 mx-auto max-w-7xl sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
