import { cn } from "@/src/lib/utils/cn";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between pb-8",
        className
      )}
    >
      <div>
        <h1 className="text-h1 text-text-primary">{title}</h1>
        {description && (
          <p className="mt-1 text-body text-text-secondary">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}
