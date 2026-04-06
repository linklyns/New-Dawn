import type { ReactNode } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

function buildBreadcrumbs(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  const crumbs: { label: string; to: string }[] = [];
  let path = '';
  for (const part of parts) {
    path += `/${part}`;
    crumbs.push({
      label: part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' '),
      to: path,
    });
  }
  return crumbs;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  const location = useLocation();
  const crumbs = buildBreadcrumbs(location.pathname);

  return (
    <div className="mb-6">
      {/* Breadcrumb */}
      {crumbs.length > 1 && (
        <nav className="mb-2 flex items-center gap-1 text-sm text-warm-gray">
          {crumbs.map((crumb, i) => (
            <span key={crumb.to} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={14} />}
              {i < crumbs.length - 1 ? (
                <Link to={crumb.to} className="hover:text-golden-honey">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-slate-navy dark:text-white">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-navy dark:text-white">
            {title}
          </h1>
          {subtitle && <p className="mt-1 text-sm text-warm-gray">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}
