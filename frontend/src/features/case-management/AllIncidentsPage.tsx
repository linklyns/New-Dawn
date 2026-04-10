import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Search, ArrowUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { smartMatch } from '../../lib/smartSearch';
import { getPageSizeOptions } from '../../lib/pagination';
import { useResidentMap } from '../../hooks/useResidentMap';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import type { IncidentReport } from '../../types/models';
import type { PagedResult } from '../../types/api';

function formatDate(d: string | null | undefined): string {
  if (!d) return '--';
  try {
    return format(parseISO(d), 'MMM d, yyyy');
  } catch {
    return d;
  }
}

function severityVariant(s: string): 'danger' | 'warning' | 'info' | 'neutral' {
  switch (s) {
    case 'Critical': return 'danger';
    case 'High': return 'danger';
    case 'Medium': return 'warning';
    case 'Low': return 'info';
    default: return 'neutral';
  }
}

const selectClass = 'rounded-lg border border-slate-navy/20 bg-white px-3 py-2 text-sm text-slate-navy focus:border-golden-honey focus:outline-none dark:border-white/20 dark:bg-dark-surface dark:text-white';

const severityOrder: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };

type SortKey = 'date' | 'severity';

function translateSeverity(t: (key: string) => string, value: string): string {
  switch (value) {
    case 'Critical': return t('caseManagement.critical');
    case 'High': return t('caseManagement.high');
    case 'Medium': return t('caseManagement.medium');
    case 'Low': return t('caseManagement.low');
    default: return value;
  }
}

export function AllIncidentsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading } = useQuery({
    queryKey: ['all-incident-reports'],
    queryFn: () =>
      api.get<PagedResult<IncidentReport>>(
        `/api/incident-reports?page=1&pageSize=500`,
      ),
  });

  const { residentMap } = useResidentMap();

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  };

  const processed = useMemo(() => {
    let items = data?.items ?? [];
    if (severityFilter) items = items.filter((r) => r.severity === severityFilter);
    if (search.trim()) {
      items = items.filter((r) => {
        const resident = residentMap.get(r.residentId);
        return smartMatch(search, [
          resident?.internalCode, resident?.caseControlNo,
          r.incidentType, r.severity, r.reportedBy, r.incidentDate,
        ]);
      });
    }
    return [...items].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'date') cmp = a.incidentDate.localeCompare(b.incidentDate);
      else if (sortKey === 'severity') cmp = (severityOrder[a.severity] ?? 0) - (severityOrder[b.severity] ?? 0);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, search, severityFilter, sortKey, sortDir, residentMap]);

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
      key: 'incidentDate',
      header: <span className="flex items-center">{t('common.date')} <SortBtn col="date" /></span>,
      render: (row: Record<string, unknown>) => formatDate(row.incidentDate as string),
    },
    { key: 'incidentType', header: t('common.type') },
    {
      key: 'severity',
      header: <span className="flex items-center">{t('caseManagement.severity')} <SortBtn col="severity" /></span>,
      render: (row: Record<string, unknown>) => (
        <Badge variant={severityVariant(row.severity as string)}>
          {translateSeverity(t, row.severity as string)}
        </Badge>
      ),
    },
    { key: 'reportedBy', header: t('caseManagement.reportedBy') },
    {
      key: 'resolved',
      header: t('caseManagement.resolved'),
      render: (row: Record<string, unknown>) =>
        row.resolved ? <Badge variant="success">{t('common.yes')}</Badge> : <Badge variant="warning">{t('common.no')}</Badge>,
    },
    {
      key: 'followUpRequired',
      header: t('caseManagement.followUpRequired'),
      render: (row: Record<string, unknown>) =>
        row.followUpRequired ? <Badge variant="info">{t('common.required')}</Badge> : <span className="text-warm-gray">--</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('caseManagement.allIncidents')}
        subtitle={t('caseManagement.incidentReports')}
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft size={16} />
            {t('common.back')}
          </Button>
        }
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
          <select className={selectClass} value={severityFilter} onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}>
              <option value="">{t('common.all')} {t('caseManagement.severity').toLowerCase()}</option>
              <option value="Critical">{t('caseManagement.critical')}</option>
              <option value="High">{t('caseManagement.high')}</option>
              <option value="Medium">{t('caseManagement.medium')}</option>
              <option value="Low">{t('caseManagement.low')}</option>
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
            const report = row as unknown as IncidentReport;
            navigate(`/admin/case/${report.residentId}/incidents`);
          }}
        />
      </Card>
    </div>
  );
}
