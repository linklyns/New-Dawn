import type { ReactNode } from 'react';
import { Spinner } from './Spinner';
import { Button } from './Button';

interface Column<T> {
  key: string;
  header: ReactNode;
  render?: (row: T) => ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  loading = false,
  emptyMessage = 'No data found.',
  page,
  pageSize,
  totalPages,
  totalCount,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}: TableProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-warm-gray">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-navy/10 dark:border-white/10">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 font-heading text-xs font-semibold uppercase tracking-wide text-warm-gray"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={idx}
              className={`border-b border-slate-navy/5 dark:border-white/5 ${idx % 2 === 1 ? 'bg-slate-navy/[0.02] dark:bg-white/[0.02]' : ''} ${onRowClick ? 'cursor-pointer hover:bg-sky-blue/10' : ''}`}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-slate-navy dark:text-white">
                  {col.render ? col.render(row) : String(row[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {page !== undefined && totalPages !== undefined && onPageChange && (
        <div className="flex flex-col gap-4 border-t border-slate-navy/10 px-4 py-3 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <span className="text-sm text-warm-gray">
              {totalPages === 1 && pageSize && totalCount && pageSize >= totalCount ? (
                <>Showing all {totalCount} {totalCount === 1 ? 'record' : 'records'}</>
              ) : (
                <>
                  Page {page} of {totalPages}
                  {totalCount !== undefined && (
                    <span className="ml-2">
                      ({totalCount} total {totalCount === 1 ? 'record' : 'records'})
                    </span>
                  )}
                </>
              )}
            </span>

            {onPageSizeChange && pageSizeOptions && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-navy dark:text-white">
                  Records per page:
                </label>
                <select
                  className="rounded-lg border border-slate-navy/20 bg-white px-3 py-1 text-sm text-slate-navy focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-slate-navy dark:text-white"
                  value={pageSize || 20}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                >
                  {pageSizeOptions
                    .filter((size) => !totalCount || size <= totalCount)
                    .map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  {totalCount !== undefined && totalCount <= 1000 && (
                    <option value={totalCount}>All ({totalCount})</option>
                  )}
                </select>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
              >
                ← Previous
              </Button>

              {totalPages <= 10 ? (
                // Show all pages if 10 or fewer
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <Button
                      key={pageNum}
                      variant={pageNum === page ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => onPageChange(pageNum)}
                      className="min-w-[2.5rem]"
                    >
                      {pageNum}
                    </Button>
                  ))}
                </div>
              ) : (
                // Show page selector for many pages
                <div className="flex items-center gap-2">
                  <span className="text-sm text-warm-gray">Go to page:</span>
                  <select
                    className="rounded-lg border border-slate-navy/20 bg-white px-2 py-1 text-sm text-slate-navy focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-slate-navy dark:text-white"
                    value={page}
                    onChange={(e) => onPageChange(Number(e.target.value))}
                  >
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <option key={pageNum} value={pageNum}>
                        {pageNum}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
              >
                Next →
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
