import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Plus } from 'lucide-react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { useDebounce } from '../../hooks/useDebounce';
import type { Resident, Safehouse } from '../../types/models';
import type { PagedResult } from '../../types/api';

const selectClass =
  'rounded-lg border border-slate-navy/20 bg-white px-3 py-2 text-sm text-slate-navy focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-slate-navy dark:text-white';

function statusBadgeVariant(status: string): 'success' | 'neutral' | 'info' {
  switch (status) {
    case 'Active':
      return 'success';
    case 'Closed':
      return 'neutral';
    case 'Transferred':
      return 'info';
    default:
      return 'neutral';
  }
}

function riskBadgeVariant(risk: string): 'danger' | 'warning' | 'info' | 'success' {
  switch (risk) {
    case 'Critical':
      return 'danger';
    case 'High':
      return 'warning';
    case 'Medium':
      return 'info';
    case 'Low':
      return 'success';
    default:
      return 'info';
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

export function ResidentsList() {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [caseStatus, setCaseStatus] = useState('');
  const [safehouseId, setSafehouseId] = useState('');
  const [caseCategory, setCaseCategory] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const { data: safehousesData } = useQuery({
    queryKey: ['safehouses'],
    queryFn: () => api.get<PagedResult<Safehouse>>('/api/safehouses?pageSize=100'),
  });

  const safehouseMap = new Map(
    (safehousesData?.items ?? []).map((s) => [s.safehouseId, s.name]),
  );

  const queryParams = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    ...(caseStatus && { caseStatus }),
    ...(safehouseId && { safehouseId }),
    ...(caseCategory && { caseCategory }),
    ...(riskLevel && { riskLevel }),
    ...(debouncedSearch && { search: debouncedSearch }),
  });

  const {
    data: residentsData,
    isLoading,
  } = useQuery({
    queryKey: ['residents', page, pageSize, caseStatus, safehouseId, caseCategory, riskLevel, debouncedSearch],
    queryFn: () =>
      api.get<PagedResult<Resident>>(`/api/residents?${queryParams.toString()}`),
  });

  const resetPage = () => setPage(1);

  const columns = [
    {
      key: 'internalCode',
      header: 'Internal Code',
    },
    {
      key: 'caseControlNo',
      header: 'Case Control No.',
    },
    {
      key: 'safehouseId',
      header: 'Safehouse',
      render: (row: Resident) => safehouseMap.get(row.safehouseId) ?? `#${row.safehouseId}`,
    },
    {
      key: 'caseStatus',
      header: 'Status',
      render: (row: Resident) => (
        <Badge variant={statusBadgeVariant(row.caseStatus)}>
          {row.caseStatus}
        </Badge>
      ),
    },
    {
      key: 'currentRiskLevel',
      header: 'Risk Level',
      render: (row: Resident) => (
        <Badge variant={riskBadgeVariant(row.currentRiskLevel)}>
          {row.currentRiskLevel}
        </Badge>
      ),
    },
    {
      key: 'caseCategory',
      header: 'Category',
    },
    {
      key: 'dateOfAdmission',
      header: 'Admission Date',
      render: (row: Resident) => formatDate(row.dateOfAdmission),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Caseload Inventory"
        subtitle="Manage resident cases"
        action={
          <Button onClick={() => navigate('/admin/residents/new')}>
            <Plus size={16} />
            Add Resident
          </Button>
        }
      />

      {/* Filter Bar */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-navy dark:text-white">
              Case Status
            </label>
            <select
              className={selectClass}
              value={caseStatus}
              onChange={(e) => {
                setCaseStatus(e.target.value);
                resetPage();
              }}
            >
              <option value="">All</option>
              <option value="Active">Active</option>
              <option value="Closed">Closed</option>
              <option value="Transferred">Transferred</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-navy dark:text-white">
              Safehouse
            </label>
            <select
              className={selectClass}
              value={safehouseId}
              onChange={(e) => {
                setSafehouseId(e.target.value);
                resetPage();
              }}
            >
              <option value="">All</option>
              {(safehousesData?.items ?? []).map((s) => (
                <option key={s.safehouseId} value={String(s.safehouseId)}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-navy dark:text-white">
              Case Category
            </label>
            <select
              className={selectClass}
              value={caseCategory}
              onChange={(e) => {
                setCaseCategory(e.target.value);
                resetPage();
              }}
            >
              <option value="">All</option>
              <option value="Neglected">Neglected</option>
              <option value="Surrendered">Surrendered</option>
              <option value="Abandoned">Abandoned</option>
              <option value="CICL">CICL</option>
              <option value="Trafficked">Trafficked</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-navy dark:text-white">
              Risk Level
            </label>
            <select
              className={selectClass}
              value={riskLevel}
              onChange={(e) => {
                setRiskLevel(e.target.value);
                resetPage();
              }}
            >
              <option value="">All</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div className="min-w-[200px]">
            <Input
              label="Search"
              placeholder="Case no. or code..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0">
        <Table<Record<string, unknown>>
          columns={columns as { key: string; header: string; render?: (row: Record<string, unknown>) => React.ReactNode }[]}
          data={(residentsData?.items ?? []) as unknown as Record<string, unknown>[]}
          loading={isLoading}
          emptyMessage="No residents found matching your filters."
          onRowClick={(row) =>
            navigate(`/admin/residents/${(row as unknown as Resident).residentId}`)
          }
          page={residentsData?.page}
          totalPages={residentsData?.totalPages}
          onPageChange={setPage}
        />
      </Card>
    </div>
  );
}
