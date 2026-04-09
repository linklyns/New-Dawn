import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Search, ArrowUpDown } from 'lucide-react';
import { api } from '../../lib/api';
import { smartMatch } from '../../lib/smartSearch';
import { getPageSizeOptions } from '../../lib/pagination';
import { useResidentMap } from '../../hooks/useResidentMap';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import type { HealthWellbeingRecord } from '../../types/models';
import type { PagedResult } from '../../types/api';

function formatDate(d: string | null | undefined): string {
  if (!d) return '--';
  try {
    return format(parseISO(d), 'MMM d, yyyy');
  } catch {
    return d;
  }
}

function healthScoreVariant(score: number): 'success' | 'warning' | 'danger' | 'info' {
  if (score >= 8) return 'success';
  if (score >= 5) return 'info';
  if (score >= 3) return 'warning';
  return 'danger';
}

type SortKey = 'date' | 'health';

export function AllHealthPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading } = useQuery({
    queryKey: ['all-health-records'],
    queryFn: () =>
      api.get<PagedResult<HealthWellbeingRecord>>(
        `/api/health-records?page=1&pageSize=500`,
      ),
  });

  const { residentMap } = useResidentMap();

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  };

  const processed = useMemo(() => {
    let items = data?.items ?? [];
    if (search.trim()) {
      items = items.filter((r) => {
        const resident = residentMap.get(r.residentId);
        return smartMatch(search, [
          resident?.internalCode, resident?.caseControlNo,
          r.recordDate, String(r.generalHealthScore),
        ]);
      });
    }
    return [...items].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'date') cmp = a.recordDate.localeCompare(b.recordDate);
      else if (sortKey === 'health') cmp = a.generalHealthScore - b.generalHealthScore;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, search, sortKey, sortDir, residentMap]);

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
      header: 'Resident',
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
      header: <span className="flex items-center">Date <SortBtn col="date" /></span>,
      render: (row: Record<string, unknown>) => formatDate(row.recordDate as string),
    },
    {
      key: 'generalHealthScore',
      header: <span className="flex items-center">Health <SortBtn col="health" /></span>,
      render: (row: Record<string, unknown>) => (
        <Badge variant={healthScoreVariant(row.generalHealthScore as number)}>
          {String(row.generalHealthScore)}/10
        </Badge>
      ),
    },
    {
      key: 'nutritionScore',
      header: 'Nutrition',
      render: (row: Record<string, unknown>) => `${row.nutritionScore}/10`,
    },
    {
      key: 'sleepQualityScore',
      header: 'Sleep',
      render: (row: Record<string, unknown>) => `${row.sleepQualityScore}/10`,
    },
    {
      key: 'bmi',
      header: 'BMI',
      render: (row: Record<string, unknown>) => Number(row.bmi).toFixed(1),
    },
    {
      key: 'medicalCheckupDone',
      header: 'Medical',
      render: (row: Record<string, unknown>) =>
        row.medicalCheckupDone ? <Badge variant="success">Done</Badge> : <span className="text-warm-gray">--</span>,
    },
    {
      key: 'psychologicalCheckupDone',
      header: 'Psych',
      render: (row: Record<string, unknown>) =>
        row.psychologicalCheckupDone ? <Badge variant="success">Done</Badge> : <span className="text-warm-gray">--</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Health & Wellbeing"
        subtitle="All health records across residents"
      />

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray dark:text-white/40" />
            <input
              className="w-full rounded-lg border border-slate-navy/20 bg-white py-2 pl-9 pr-3 text-sm text-slate-navy placeholder:text-warm-gray/60 focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-dark-surface dark:text-white"
              placeholder="Smart search (e.g. LS-0001, 8)"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        <Table
          columns={columns}
          data={processed.slice((page - 1) * pageSize, page * pageSize) as unknown as Record<string, unknown>[]}
          loading={isLoading}
          emptyMessage="No health records found."
          page={page}
          pageSize={pageSize}
          totalPages={Math.max(1, Math.ceil(processed.length / pageSize))}
          totalCount={processed.length}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={getPageSizeOptions(processed.length)}
          onRowClick={(row) => {
            const rec = row as unknown as HealthWellbeingRecord;
            navigate(`/admin/case/${rec.residentId}/health`);
          }}
        />
      </Card>
    </div>
  );
}
