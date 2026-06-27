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
import { usePathname } from "next/navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { userProfile } = useUser();
  const firestore = useFirestore();
  const pathname = usePathname();

  const companyRef = useMemo(() => {
    if (!userProfile?.companyId) return null;
    return doc(firestore, 'companies', userProfile.companyId) as DocumentReference<Company>;
  }, [firestore, userProfile?.companyId]);
  
  const { data: company, loading: companyLoading } = useDoc<Company>(companyRef);

  return (
    <AuthGuard>
      <div className="flex flex-col flex-1 min-h-screen relative overflow-hidden bg-background/50">
        {/* Animated Orbs */}
        <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
        <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />

        <header className="sticky top-0 z-50 w-full h-20 glass-card border-b border-white/10 flex items-center">
            <div className="flex items-center w-full px-4 mx-auto max-w-7xl md:px-6">

                {/* Desktop Navigation */}
                <div className="items-center hidden gap-10 mr-10 md:flex">
                    <Link href="/dashboard" className="flex items-center gap-3 group">
                        <motion.div 
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            className="p-2 bg-primary rounded-xl shadow-lg shadow-primary/20"
                        >
                            <Logo className="w-6 h-6 text-white" />
                        </motion.div>
                        <span className="text-2xl font-black tracking-tighter text-gradient">Projexia</span>
                    </Link>
                    <MainNav />
                </div>
                
                {/* Mobile Navigation */}
                <Sheet>
                    <SheetTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 md:hidden hover:bg-primary/10"
                    >
                        <Menu className="h-6 w-6" />
                    </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="glass-card border-none w-80">
                        <nav className="grid gap-8 text-lg font-medium pt-10">
                            <Link href="/dashboard" className="flex items-center gap-3 mb-6">
                                <Logo className="w-8 h-8" />
                                <span className="text-2xl font-black text-gradient">Projexia</span>
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
              key={pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ 
                type: "spring",
                stiffness: 260,
                damping: 20 
              }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </AuthGuard>
  );
}