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
import type { HomeVisitation } from '../../types/models';
import type { PagedResult } from '../../types/api';

function formatDate(d: string | null | undefined): string {
  if (!d) return '--';
  try {
    return format(parseISO(d), 'MMM d, yyyy');
  } catch {
    return d;
  }
}

function outcomeVariant(o: string): 'success' | 'warning' | 'info' | 'neutral' | 'danger' {
  switch (o) {
    case 'Favorable': return 'success';
    case 'Inconclusive': return 'info';
    case 'Needs Improvement': return 'warning';
    case 'Unfavorable': return 'danger';
    default: return 'neutral';
  }
}

function translateOutcome(t: (key: string) => string, value: string): string {
  switch (value) {
    case 'Favorable': return t('caseManagement.favorable');
    case 'Inconclusive': return t('caseManagement.inconclusive');
    case 'Needs Improvement': return t('caseManagement.needsImprovement');
    case 'Unfavorable': return t('caseManagement.unfavorable');
    default: return value;
  }
}

const selectClass = 'rounded-lg border border-slate-navy/20 bg-white px-3 py-2 text-sm text-slate-navy focus:border-golden-honey focus:outline-none dark:border-white/20 dark:bg-dark-surface dark:text-white';

type SortKey = 'date' | 'worker' | 'outcome';

export function AllVisitationsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading } = useQuery({
    queryKey: ['all-home-visitations'],
    queryFn: () =>
      api.get<PagedResult<HomeVisitation>>(
        `/api/home-visitations?page=1&pageSize=500`,
      ),
  });

  const { residentMap } = useResidentMap();

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  };

  const processed = useMemo(() => {
    let items = data?.items ?? [];
    if (outcomeFilter) items = items.filter((v) => v.visitOutcome === outcomeFilter);
    if (search.trim()) {
      items = items.filter((v) => {
        const resident = residentMap.get(v.residentId);
        return smartMatch(search, [
          resident?.internalCode, resident?.caseControlNo,
          v.socialWorker, v.visitType, v.locationVisited,
          v.visitDate, v.familyCooperationLevel, v.visitOutcome,
        ]);
      });
    }
    return [...items].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'date') cmp = a.visitDate.localeCompare(b.visitDate);
      else if (sortKey === 'worker') cmp = a.socialWorker.localeCompare(b.socialWorker);
      else if (sortKey === 'outcome') cmp = a.visitOutcome.localeCompare(b.visitOutcome);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, search, outcomeFilter, sortKey, sortDir, residentMap]);

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
      key: 'visitDate',
      header: <span className="flex items-center">{t('caseManagement.visitDate')} <SortBtn col="date" /></span>,
      render: (row: Record<string, unknown>) => formatDate(row.visitDate as string),
    },
    {
      key: 'socialWorker',
      header: <span className="flex items-center">{t('caseManagement.socialWorker')} <SortBtn col="worker" /></span>,
    },
    { key: 'visitType', header: t('common.type') },
    { key: 'locationVisited', header: t('caseManagement.location') },
    { key: 'familyCooperationLevel', header: t('caseManagement.familyCooperation') },
    {
      key: 'visitOutcome',
      header: <span className="flex items-center">{t('caseManagement.outcome')} <SortBtn col="outcome" /></span>,
      render: (row: Record<string, unknown>) => (
        <Badge variant={outcomeVariant(row.visitOutcome as string)}>
          {translateOutcome(t, row.visitOutcome as string)}
        </Badge>
      ),
    },
    {
      key: 'safetyConcernsNoted',
      header: t('caseManagement.safetyConcerns'),
      render: (row: Record<string, unknown>) =>
        row.safetyConcernsNoted ? <Badge variant="danger">{t('common.yes')}</Badge> : <span className="text-warm-gray">{t('common.no')}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('caseManagement.allVisitations')}
        subtitle={t('caseManagement.homeVisitations')}
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
          <select className={selectClass} value={outcomeFilter} onChange={(e) => { setOutcomeFilter(e.target.value); setPage(1); }}>
              <option value="">{t('common.all')} {t('caseManagement.outcome').toLowerCase()}</option>
              <option value="Favorable">{t('caseManagement.favorable')}</option>
              <option value="Inconclusive">{t('caseManagement.inconclusive')}</option>
              <option value="Needs Improvement">{t('caseManagement.needsImprovement')}</option>
              <option value="Unfavorable">{t('caseManagement.unfavorable')}</option>
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
            const visit = row as unknown as HomeVisitation;
            navigate(`/admin/case/${visit.residentId}/visits`);
          }}
        />
      </Card>
    </div>
  );
}
