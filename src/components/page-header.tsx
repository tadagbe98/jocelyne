
"use client";

import { cn } from "@/lib/utils";
import { Breadcrumb, type BreadcrumbItem } from "@/components/breadcrumb";
import { motion } from "framer-motion";

export function PageHeader({ 
  title, 
  description, 
  actions, 
  breadcrumbs, 
  className 
}: { 
  title: React.ReactNode; 
  description?: React.ReactNode; 
  actions?: React.ReactNode, 
  breadcrumbs?: BreadcrumbItem[], 
  className?: string 
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn("space-y-4 mb-10", className)}
    >
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumb items={breadcrumbs} />}
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="grid gap-2">
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl font-headline bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-indigo-600">
            {title}
          </h1>
          {description && <div className="text-lg text-muted-foreground/80 max-w-2xl">{description}</div>}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
      <div className="h-1 w-20 bg-primary rounded-full" />
    </motion.div>
  );
}
