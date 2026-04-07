import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import type { DonationAllocation } from '../../types/models';
import type { PagedResult } from '../../types/api';

function formatDate(d: string | null | undefined): string {
  if (!d) return '--';
  try {
    return format(parseISO(d), 'MMM d, yyyy');
  } catch {
    return d;
  }
}

export function AllocationsList() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['donation-allocations', page],
    queryFn: () =>
      api.get<PagedResult<DonationAllocation>>(
        `/api/donation-allocations?page=${page}&pageSize=20`,
      ),
  });

  const columns = [
    {
      key: 'donationId',
      header: 'Donation',
      render: (row: Record<string, unknown>) => `#${row.donationId}`,
    },
    {
      key: 'safehouseId',
      header: 'Safehouse',
      render: (row: Record<string, unknown>) => `#${row.safehouseId}`,
    },
    { key: 'programArea', header: 'Program Area' },
    {
      key: 'amountAllocated',
      header: 'Amount',
      render: (row: Record<string, unknown>) =>
        `PHP ${Number(row.amountAllocated).toLocaleString()}`,
    },
    {
      key: 'allocationDate',
      header: 'Date',
      render: (row: Record<string, unknown>) => formatDate(row.allocationDate as string),
    },
    {
      key: 'allocationNotes',
      header: 'Notes',
      render: (row: Record<string, unknown>) => {
        const notes = row.allocationNotes as string | null;
        if (!notes) return '--';
        return notes.length > 50 ? notes.slice(0, 50) + '...' : notes;
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Donation Allocations"
        subtitle="How donations are distributed across safehouses and programs"
      />

      <Card>
        <Table
          columns={columns}
          data={(data?.items ?? []) as unknown as Record<string, unknown>[]}
          loading={isLoading}
          emptyMessage="No allocations found."
          page={page}
          totalPages={data?.totalPages ?? 1}
          onPageChange={setPage}
        />
      </Card>
    </div>
  );
}
