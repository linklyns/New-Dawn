import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Search, ArrowUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { smartMatch } from '../../lib/smartSearch';
import { getPageSizeOptions } from '../../lib/pagination';
import { useResidentMap } from '../../hooks/useResidentMap';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import type { EducationRecord } from '../../types/models';
import type { PagedResult } from '../../types/api';

function formatDate(d: string | null | undefined): string {
  if (!d) return '--';
  try {
    return format(parseISO(d), 'MMM d, yyyy');
  } catch {
    return d;
  }
}

function statusVariant(s: string): 'success' | 'warning' | 'info' | 'neutral' {
  switch (s) {
    case 'Completed': return 'success';
    case 'InProgress': return 'info';
    case 'NotStarted': return 'neutral';
    case 'Dropped': return 'warning';
    default: return 'neutral';
  }
}

function translateCompletionStatus(t: (key: string) => string, value: string): string {
  switch (value) {
    case 'Completed': return t('caseManagement.completed');
    case 'InProgress': return t('caseManagement.inProgress');
    case 'NotStarted': return t('caseManagement.notStarted');
    default: return value;
  }
}

const selectClass = 'rounded-lg border border-slate-navy/20 bg-white px-3 py-2 text-sm text-slate-navy focus:border-golden-honey focus:outline-none dark:border-white/20 dark:bg-dark-surface dark:text-white';

type SortKey = 'date' | 'attendance' | 'progress';

export function AllEducationPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading } = useQuery({
    queryKey: ['all-education-records'],
    queryFn: () =>
      api.get<PagedResult<EducationRecord>>(
        `/api/education-records?page=1&pageSize=500`,
      ),
  });

  const { residentMap } = useResidentMap();

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  };

  const processed = useMemo(() => {
    let items = data?.items ?? [];
    if (statusFilter) items = items.filter((r) => r.completionStatus === statusFilter);
    if (search.trim()) {
      items = items.filter((r) => {
        const resident = residentMap.get(r.residentId);
        return smartMatch(search, [
          resident?.internalCode, resident?.caseControlNo,
          r.educationLevel, r.schoolName, r.enrollmentStatus,
          r.completionStatus, r.recordDate,
        ]);
      });
    }
    return [...items].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'date') cmp = a.recordDate.localeCompare(b.recordDate);
      else if (sortKey === 'attendance') cmp = a.attendanceRate - b.attendanceRate;
      else if (sortKey === 'progress') cmp = a.progressPercent - b.progressPercent;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, search, statusFilter, sortKey, sortDir, residentMap]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  }

  function SortBtn({ col }: { col: SortKey }) {
    return (
      <button
        className={`ml-1 inline-flex items-center hover:opacity-100 ${sortKey === col ? 'text-golden-honey opacity-100' : 'opacity-50'}`}
        onClick={() => toggleSort(col)}
        type="button"
      >
        <ArrowUpDown size={13} />
      </button>
    );
  }

  const columns = [
    {
      key: 'residentId',
      header: t('caseManagement.resident'),
      render: (row: Record<string, unknown>) => {
        const residentId = Number(row.residentId ?? 0);
        const resident = residentMap.get(residentId);
        return resident ? (
          <div className="space-y-0.5">
            <div>{resident.internalCode}</div>
            <div className="text-xs text-warm-gray">{resident.caseControlNo}</div>
          </div>
        ) : `#${residentId}`;
      },
    },
    {
      key: 'recordDate',
      header: <span className="flex items-center">{t('common.date')} <SortBtn col="date" /></span>,
      render: (row: Record<string, unknown>) => formatDate(row.recordDate as string),
    },
    { key: 'educationLevel', header: t('caseManagement.educationLevel') },
    { key: 'schoolName', header: t('caseManagement.schoolName') },
    { key: 'enrollmentStatus', header: t('caseManagement.enrollmentStatus') },
    {
      key: 'attendanceRate',
      header: <span className="flex items-center">{t('caseManagement.attendancePercent')} <SortBtn col="attendance" /></span>,
      render: (row: Record<string, unknown>) => `${row.attendanceRate}%`,
    },
    {
      key: 'progressPercent',
      header: <span className="flex items-center">{t('caseManagement.progressPercent')} <SortBtn col="progress" /></span>,
      render: (row: Record<string, unknown>) => `${row.progressPercent}%`,
    },
    {
      key: 'completionStatus',
      header: t('common.status'),
      render: (row: Record<string, unknown>) => (
        <Badge variant={statusVariant(row.completionStatus as string)}>
          {translateCompletionStatus(t, row.completionStatus as string)}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('caseManagement.allEducation')}
        subtitle={t('caseManagement.educationRecords')}
      />

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1 sm:min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray dark:text-white/40" />
            <input
              className="w-full rounded-lg border border-slate-navy/20 bg-white py-2 pl-9 pr-3 text-sm text-slate-navy placeholder:text-warm-gray/60 focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-dark-surface dark:text-white"
                placeholder={t('common.search')}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select className={selectClass} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">{t('common.all')} {t('common.status').toLowerCase()}</option>
              <option value="Completed">{t('caseManagement.completed')}</option>
              <option value="InProgress">{t('caseManagement.inProgress')}</option>
              <option value="NotStarted">{t('caseManagement.notStarted')}</option>
            <option value="Dropped">Dropped</option>
          </select>
        </div>

        <Table
          columns={columns}
          data={processed.slice((page - 1) * pageSize, page * pageSize) as unknown as Record<string, unknown>[]}
          loading={isLoading}
          emptyMessage={t('common.noData')}
          page={page}
          pageSize={pageSize}
          totalPages={Math.max(1, Math.ceil(processed.length / pageSize))}
          totalCount={processed.length}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={getPageSizeOptions(processed.length)}
          onRowClick={(row) => {
            const rec = row as unknown as EducationRecord;
            navigate(`/admin/case/${rec.residentId}/education`);
          }}
        />
      </Card>
    </div>
  );
}
