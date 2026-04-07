import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { api } from '../../lib/api';
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

export function AllRecordingsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['all-process-recordings', page],
    queryFn: () =>
      api.get<PagedResult<ProcessRecording>>(
        `/api/process-recordings?page=${page}&pageSize=20`,
      ),
  });

  const columns = [
    {
      key: 'residentId',
      header: 'Resident',
      render: (row: Record<string, unknown>) => `#${row.residentId}`,
    },
    {
      key: 'sessionDate',
      header: 'Session Date',
      render: (row: Record<string, unknown>) => formatDate(row.sessionDate as string),
    },
    { key: 'socialWorker', header: 'Social Worker' },
    {
      key: 'sessionType',
      header: 'Type',
      render: (row: Record<string, unknown>) => (
        <Badge variant={sessionTypeBadge(row.sessionType as string)}>
          {row.sessionType as string}
        </Badge>
      ),
    },
    {
      key: 'sessionDurationMinutes',
      header: 'Duration',
      render: (row: Record<string, unknown>) => `${row.sessionDurationMinutes} min`,
    },
    {
      key: 'emotionalStateObserved',
      header: 'Emotional State',
      render: (row: Record<string, unknown>) =>
        `${row.emotionalStateObserved} → ${row.emotionalStateEnd}`,
    },
    {
      key: 'progressNoted',
      header: 'Progress',
      render: (row: Record<string, unknown>) =>
        row.progressNoted ? <Badge variant="success">Yes</Badge> : <span className="text-warm-gray">No</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Process Recordings"
        subtitle="All session recordings across residents"
      />

      <Card>
        <Table
          columns={columns}
          data={(data?.items ?? []) as unknown as Record<string, unknown>[]}
          loading={isLoading}
          emptyMessage="No process recordings found."
          page={page}
          totalPages={data?.totalPages ?? 1}
          onPageChange={setPage}
          onRowClick={(row) => {
            const rec = row as unknown as ProcessRecording;
            navigate(`/admin/case/${rec.residentId}/recordings`);
          }}
        />
      </Card>
    </div>
  );
}
