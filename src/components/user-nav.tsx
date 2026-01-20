'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut } from '@/firebase/auth/auth';
import { useUser } from '@/firebase/auth/use-user';
import { Briefcase, LogOut, Settings } from 'lucide-react';
import Link from 'next/link';
import { Company } from '@/lib/types';
import { Skeleton } from './ui/skeleton';

export function UserNav({ company, companyLoading }: { company: Company | null; companyLoading: boolean; }) {
    const { user, userProfile } = useUser();

    if (!user) {
        return null;
    }

    const isAdmin = userProfile?.roles?.includes('admin');

    const getCompanyInitials = (name: string | null | undefined) => {
        if (!name) return <Briefcase className="w-5 h-5" />;
        const initials = name
            .split(' ')
            .map((n) => n[0])
            .join('');
        return initials.toUpperCase();
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative w-10 h-10 rounded-full">
                    {companyLoading ? (
                        <Skeleton className="w-10 h-10 rounded-full" />
                    ) : (
                        <Avatar className="w-10 h-10">
                            {company?.logoUrl ? (
                                <AvatarImage src={company.logoUrl} alt={company.name!} />
                            ) : (
                                <AvatarFallback>{getCompanyInitials(company?.name)}</AvatarFallback>
                            )}
                        </Avatar>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{company?.name || 'Mon Entreprise'}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user.displayName} ({user.email})</p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdmin && (
                    <DropdownMenuGroup>
                        <Link href="/settings">
                            <DropdownMenuItem>
                                <Settings className="w-4 h-4 mr-2" />
                                Paramètres
                            </DropdownMenuItem>
                        </Link>
                    </DropdownMenuGroup>
                )}
                {isAdmin && <DropdownMenuSeparator />}
                <DropdownMenuItem onClick={signOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Se déconnecter
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
