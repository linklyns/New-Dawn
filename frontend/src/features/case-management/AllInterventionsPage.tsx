import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { api } from '../../lib/api';
import { getPageSizeOptions } from '../../lib/pagination';
import { useResidentMap } from '../../hooks/useResidentMap';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import type { InterventionPlan } from '../../types/models';
import type { PagedResult } from '../../types/api';

function formatDate(d: string | null | undefined): string {
  if (!d) return '--';
  try {
    return format(parseISO(d), 'MMM d, yyyy');
  } catch {
    return d;
  }
}

function statusVariant(s: string): 'success' | 'warning' | 'info' | 'neutral' | 'danger' {
  switch (s) {
    case 'Completed': return 'success';
    case 'Active': return 'info';
    case 'Planned': return 'neutral';
    case 'OnHold': return 'warning';
    case 'Cancelled': return 'danger';
    default: return 'neutral';
  }
}

export function AllInterventionsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data, isLoading } = useQuery({
    queryKey: ['all-interventions', page, pageSize],
    queryFn: () =>
      api.get<PagedResult<InterventionPlan>>(
        `/api/intervention-plans?page=${page}&pageSize=${pageSize}`,
      ),
  });

  const { residentMap } = useResidentMap();

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  };

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
    { key: 'planCategory', header: 'Category' },
    {
      key: 'planDescription',
      header: 'Description',
      render: (row: Record<string, unknown>) => {
        const desc = row.planDescription as string;
        return desc.length > 60 ? desc.slice(0, 60) + '...' : desc;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: Record<string, unknown>) => (
        <Badge variant={statusVariant(row.status as string)}>
          {row.status as string}
        </Badge>
      ),
    },
    {
      key: 'targetDate',
      header: 'Target Date',
      render: (row: Record<string, unknown>) => formatDate(row.targetDate as string),
    },
    {
      key: 'caseConferenceDate',
      header: 'Conference',
      render: (row: Record<string, unknown>) => formatDate(row.caseConferenceDate as string),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Intervention Plans"
        subtitle="All intervention plans across residents"
      />

      <Card>
        <Table
          columns={columns}
          data={(data?.items ?? []) as unknown as Record<string, unknown>[]}
          loading={isLoading}
          emptyMessage="No intervention plans found."
          page={page}
          pageSize={pageSize}
          totalPages={data?.totalPages ?? 1}
          totalCount={data?.totalCount}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={getPageSizeOptions(data?.totalCount)}
          onRowClick={(row) => {
            const plan = row as unknown as InterventionPlan;
            navigate(`/admin/case/${plan.residentId}/interventions`);
          }}
        />
      </Card>
    </div>
  );
}
