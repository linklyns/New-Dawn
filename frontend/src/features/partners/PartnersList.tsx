import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import type { Partner } from '../../types/models';
import type { PagedResult } from '../../types/api';

function formatDate(d: string | null | undefined): string {
  if (!d) return '--';
  try {
    return format(parseISO(d), 'MMM d, yyyy');
  } catch {
    return d;
  }
}

function statusVariant(s: string): 'success' | 'neutral' | 'danger' {
  switch (s) {
    case 'Active': return 'success';
    case 'Inactive': return 'neutral';
    case 'Suspended': return 'danger';
    default: return 'neutral';
  }
}

function typeVariant(t: string): 'info' | 'success' | 'warning' | 'neutral' {
  switch (t) {
    case 'Government': return 'info';
    case 'NGO': return 'success';
    case 'Corporate': return 'warning';
    case 'Academic': return 'neutral';
    default: return 'neutral';
  }
}

export function PartnersList() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['partners', page],
    queryFn: () =>
      api.get<PagedResult<Partner>>(
        `/api/partners?page=${page}&pageSize=20`,
      ),
  });

  const columns = [
    { key: 'partnerName', header: 'Partner Name' },
    {
      key: 'partnerType',
      header: 'Type',
      render: (row: Record<string, unknown>) => (
        <Badge variant={typeVariant(row.partnerType as string)}>
          {row.partnerType as string}
        </Badge>
      ),
    },
    { key: 'roleType', header: 'Role' },
    { key: 'contactName', header: 'Contact' },
    { key: 'email', header: 'Email' },
    { key: 'region', header: 'Region' },
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
      key: 'startDate',
      header: 'Start Date',
      render: (row: Record<string, unknown>) => formatDate(row.startDate as string),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Partners"
        subtitle="Manage organizational partnerships"
      />

      <Card>
        <Table
          columns={columns}
          data={(data?.items ?? []) as unknown as Record<string, unknown>[]}
          loading={isLoading}
          emptyMessage="No partners found."
          page={page}
          totalPages={data?.totalPages ?? 1}
          onPageChange={setPage}
        />
      </Card>
    </div>
  );
}
