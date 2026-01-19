import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions, className }: { title: string; description?: string; actions?: React.ReactNode, className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-4 mb-8", className)}>
      <div className="grid gap-1">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl font-headline">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
