import { cn } from "@/lib/utils";
import { Breadcrumb, type BreadcrumbItem } from "@/components/breadcrumb";

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
    <div className={cn("space-y-2 mb-8", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumb items={breadcrumbs} />}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl font-headline">{title}</h1>
          {description && <div className="text-muted-foreground">{description}</div>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
