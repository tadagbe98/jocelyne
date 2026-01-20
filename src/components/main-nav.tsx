"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Briefcase, Activity, BookOpen, Clock, ListChecks } from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { href: '/projects', icon: Briefcase, label: 'Projets' },
  { href: '/tasks', icon: ListChecks, label: 'Tâches' },
  { href: '/timesheet', icon: Clock, label: 'Feuille de temps' },
  { href: '/impact', icon: Activity, label: 'Analyse d\'Impact' },
  { href: '/resources', icon: BookOpen, label: 'Ressources' },
];

export function MainNav({ className, isMobile = false }: { className?: string; isMobile?: boolean }) {
  const pathname = usePathname();

  if (isMobile) {
    return (
      <nav className={cn('grid gap-6 text-lg font-medium', className)}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2 text-muted-foreground hover:text-foreground',
              pathname.startsWith(item.href) && 'text-foreground'
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav
      className={cn('flex items-center space-x-4 lg:space-x-6', className)}
    >
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'text-sm font-medium transition-colors hover:text-primary',
            pathname.startsWith(item.href)
              ? 'text-foreground'
              : 'text-muted-foreground'
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
