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
import { LogOut, Settings, User } from 'lucide-react';
import Link from 'next/link';

export function UserNav() {
    const { user, userProfile } = useUser();

    if (!user) {
        return null;
    }

    const isAdmin = userProfile?.roles?.includes('admin');

    const getInitials = (name: string | null | undefined) => {
        if (!name) return <User className="w-5 h-5" />;
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
                    <Avatar className="w-10 h-10">
                        <AvatarImage src={user.photoURL!} alt={user.displayName!} />
                        <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.displayName}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
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
