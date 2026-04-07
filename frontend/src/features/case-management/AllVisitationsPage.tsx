import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { api } from '../../lib/api';
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

function outcomeVariant(o: string): 'success' | 'warning' | 'info' | 'neutral' {
  switch (o) {
    case 'Positive': return 'success';
    case 'Concerning': return 'warning';
    case 'Neutral': return 'info';
    default: return 'neutral';
  }
}

export function AllVisitationsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['all-home-visitations', page],
    queryFn: () =>
      api.get<PagedResult<HomeVisitation>>(
        `/api/home-visitations?page=${page}&pageSize=20`,
      ),
  });

  const columns = [
    {
      key: 'residentId',
      header: 'Resident',
      render: (row: Record<string, unknown>) => `#${row.residentId}`,
    },
    {
      key: 'visitDate',
      header: 'Visit Date',
      render: (row: Record<string, unknown>) => formatDate(row.visitDate as string),
    },
    { key: 'socialWorker', header: 'Social Worker' },
    { key: 'visitType', header: 'Type' },
    { key: 'locationVisited', header: 'Location' },
    {
      key: 'familyCooperationLevel',
      header: 'Cooperation',
    },
    {
      key: 'visitOutcome',
      header: 'Outcome',
      render: (row: Record<string, unknown>) => (
        <Badge variant={outcomeVariant(row.visitOutcome as string)}>
          {row.visitOutcome as string}
        </Badge>
      ),
    },
    {
      key: 'safetyConcernsNoted',
      header: 'Safety Concerns',
      render: (row: Record<string, unknown>) =>
        row.safetyConcernsNoted ? <Badge variant="danger">Yes</Badge> : <span className="text-warm-gray">No</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Home Visitations"
        subtitle="All home visits across residents"
      />

      <Card>
        <Table
          columns={columns}
          data={(data?.items ?? []) as unknown as Record<string, unknown>[]}
          loading={isLoading}
          emptyMessage="No home visitations found."
          page={page}
          totalPages={data?.totalPages ?? 1}
          onPageChange={setPage}
          onRowClick={(row) => {
            const visit = row as unknown as HomeVisitation;
            navigate(`/admin/case/${visit.residentId}/visits`);
          }}
        />
      </Card>
    </div>
  );
}
