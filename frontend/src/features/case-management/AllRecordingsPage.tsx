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
import type { ProcessRecording } from '../../types/models';
import type { PagedResult } from '../../types/api';

function formatDate(d: string | null | undefined): string {
  if (!d) return '--';
  try {
    return format(parseISO(d), 'MMM d, yyyy');
  } catch {
    return d;
  }
}

function sessionTypeBadge(t: string): 'info' | 'warning' | 'success' {
  switch (t) {
    case 'Individual': return 'info';
    case 'Group': return 'warning';
    case 'Family': return 'success';
    default: return 'info';
  }
}

function translateSessionType(t: (key: string) => string, value: string): string {
  switch (value) {
    case 'Individual': return t('caseManagement.individual');
    case 'Group': return t('caseManagement.group');
    case 'Family': return t('caseManagement.family');
    default: return value;
  }
}

const selectClass = 'rounded-lg border border-slate-navy/20 bg-white px-3 py-2 text-sm text-slate-navy focus:border-golden-honey focus:outline-none dark:border-white/20 dark:bg-dark-surface dark:text-white';

type SortKey = 'date' | 'duration' | 'worker';

export function AllRecordingsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading } = useQuery({
    queryKey: ['all-process-recordings'],
    queryFn: () =>
      api.get<PagedResult<ProcessRecording>>(
        `/api/process-recordings?page=1&pageSize=500`,
      ),
  });

  const { residentMap } = useResidentMap();

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  };

  const processed = useMemo(() => {
    let items = data?.items ?? [];
    if (typeFilter) items = items.filter((r) => r.sessionType === typeFilter);
    if (search.trim()) {
      items = items.filter((r) => {
        const resident = residentMap.get(r.residentId);
        return smartMatch(search, [
          resident?.internalCode, resident?.caseControlNo,
          r.socialWorker, r.sessionType, r.sessionDate,
          r.emotionalStateObserved, r.emotionalStateEnd,
        ]);
      });
    }
    return [...items].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'date') cmp = a.sessionDate.localeCompare(b.sessionDate);
      else if (sortKey === 'duration') cmp = a.sessionDurationMinutes - b.sessionDurationMinutes;
      else if (sortKey === 'worker') cmp = a.socialWorker.localeCompare(b.socialWorker);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, search, typeFilter, sortKey, sortDir, residentMap]);

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
      key: 'sessionDate',
      header: <span className="flex items-center">{t('caseManagement.sessionDate')} <SortBtn col="date" /></span>,
      render: (row: Record<string, unknown>) => formatDate(row.sessionDate as string),
    },
    {
      key: 'socialWorker',
      header: <span className="flex items-center">{t('caseManagement.socialWorker')} <SortBtn col="worker" /></span>,
    },
    {
      key: 'sessionType',
      header: t('common.type'),
      render: (row: Record<string, unknown>) => (
        <Badge variant={sessionTypeBadge(row.sessionType as string)}>
          {translateSessionType(t, row.sessionType as string)}
        </Badge>
      ),
    },
    {
      key: 'sessionDurationMinutes',
      header: <span className="flex items-center">{t('caseManagement.durationMin')} <SortBtn col="duration" /></span>,
      render: (row: Record<string, unknown>) => `${row.sessionDurationMinutes} min`,
    },
    {
      key: 'emotionalStateObserved',
      header: t('caseManagement.emotionalStateObserved'),
      render: (row: Record<string, unknown>) =>
        `${row.emotionalStateObserved} → ${row.emotionalStateEnd}`,
    },
    {
      key: 'progressNoted',
      header: t('caseManagement.progressNoted'),
      render: (row: Record<string, unknown>) =>
        row.progressNoted ? <Badge variant="success">{t('common.yes')}</Badge> : <span className="text-warm-gray">{t('common.no')}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('caseManagement.allRecordings')}
        subtitle={t('caseManagement.processRecordings')}
      />

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray dark:text-white/40" />
            <input
              className="w-full rounded-lg border border-slate-navy/20 bg-white py-2 pl-9 pr-3 text-sm text-slate-navy placeholder:text-warm-gray/60 focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-dark-surface dark:text-white"
                placeholder={t('common.search')}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select className={selectClass} value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
              <option value="">{t('common.all')} {t('common.type').toLowerCase()}</option>
              <option value="Individual">{t('caseManagement.individual')}</option>
              <option value="Group">{t('caseManagement.group')}</option>
              <option value="Family">{t('caseManagement.family')}</option>
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
            const rec = row as unknown as ProcessRecording;
            navigate(`/admin/case/${rec.residentId}/recordings`);
          }}
        />
      </Card>
    </div>
  );
}
