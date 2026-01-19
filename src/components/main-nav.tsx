"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { LayoutDashboard, Briefcase, Activity, BookOpen, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { href: '/projects', icon: Briefcase, label: 'Projets' },
  { href: '/timesheet', icon: Clock, label: 'Feuille de temps' },
  { href: '/impact', icon: Activity, label: 'Analyse d\'Impact' },
  { href: '/resources', icon: BookOpen, label: 'Ressources' },
];

export function MainNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={cn(className)}>
      <SidebarMenu>
        {navItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href}>
              <SidebarMenuButton
                isActive={pathname.startsWith(item.href)}
                tooltip={{ children: item.label }}
              >
                <item.icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </nav>
  );
}
