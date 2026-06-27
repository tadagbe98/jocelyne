
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
import { motion, AnimatePresence } from 'framer-motion';


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
      <div className="flex flex-col flex-1 min-h-screen relative overflow-hidden">
        {/* Background blobs for "Waw" effect */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

        <header className="sticky top-0 z-50 w-full glass-card border-none shadow-sm h-20 flex items-center">
            <div className="flex items-center w-full px-4 mx-auto max-w-7xl md:px-6">

                {/* Desktop Navigation */}
                <div className="items-center hidden gap-10 mr-10 md:flex">
                    <Link href="/dashboard" className="flex items-center gap-3 group">
                        <div className="p-2 bg-primary rounded-xl shadow-lg group-hover:rotate-6 transition-transform">
                            <Logo className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-black tracking-tighter text-primary">Projexia</span>
                    </Link>
                    <MainNav />
                </div>
                
                {/* Mobile Navigation */}
                <Sheet>
                    <SheetTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 md:hidden"
                    >
                        <Menu className="h-6 w-6" />
                    </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="glass-card border-none w-80">
                        <nav className="grid gap-8 text-lg font-medium pt-10">
                            <Link href="/dashboard" className="flex items-center gap-3 mb-6">
                                <Logo className="w-8 h-8" />
                                <span className="text-2xl font-black">Projexia</span>
                            </Link>
                            <MainNav isMobile />
                        </nav>
                    </SheetContent>
                </Sheet>

                {/* Right side of header */}
                <div className="flex items-center w-full gap-4 md:ml-auto md:w-auto md:gap-4">
                    <div className="flex-1 ml-auto sm:flex-initial" />
                    <UserNav company={company} companyLoading={companyLoading} />
                </div>
            </div>
        </header>

        <main className="flex-1 w-full p-4 mx-auto max-w-7xl sm:p-6 lg:p-8 z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={Math.random()} // Simplified page transition trigger
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </AuthGuard>
  );
}
