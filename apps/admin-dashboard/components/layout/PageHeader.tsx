import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  actionSlot?: React.ReactNode;
}

export function PageHeader({ title, breadcrumbs = [], actionSlot }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-5 mb-6">
      <div className="space-y-1.5">
        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">
              Home
            </Link>
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-foreground transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-foreground font-semibold">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
      </div>
      {actionSlot && <div className="flex items-center gap-3">{actionSlot}</div>}
    </div>
  );
}

export default PageHeader;
