import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
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

export function AllIncidentsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['all-incident-reports', page],
    queryFn: () =>
      api.get<PagedResult<IncidentReport>>(
        `/api/incident-reports?page=${page}&pageSize=20`,
      ),
  });

  const columns = [
    {
      key: 'residentId',
      header: 'Resident',
      render: (row: Record<string, unknown>) => `#${row.residentId}`,
    },
    {
      key: 'incidentDate',
      header: 'Date',
      render: (row: Record<string, unknown>) => formatDate(row.incidentDate as string),
    },
    { key: 'incidentType', header: 'Type' },
    {
      key: 'severity',
      header: 'Severity',
      render: (row: Record<string, unknown>) => (
        <Badge variant={severityVariant(row.severity as string)}>
          {row.severity as string}
        </Badge>
      ),
    },
    { key: 'reportedBy', header: 'Reported By' },
    {
      key: 'resolved',
      header: 'Resolved',
      render: (row: Record<string, unknown>) =>
        row.resolved ? <Badge variant="success">Yes</Badge> : <Badge variant="warning">No</Badge>,
    },
    {
      key: 'followUpRequired',
      header: 'Follow-Up',
      render: (row: Record<string, unknown>) =>
        row.followUpRequired ? <Badge variant="info">Required</Badge> : <span className="text-warm-gray">--</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Incident Reports"
        subtitle="All incident reports across residents"
      />

      <Card>
        <Table
          columns={columns}
          data={(data?.items ?? []) as unknown as Record<string, unknown>[]}
          loading={isLoading}
          emptyMessage="No incident reports found."
          page={page}
          totalPages={data?.totalPages ?? 1}
          onPageChange={setPage}
          onRowClick={(row) => {
            const report = row as unknown as IncidentReport;
            navigate(`/admin/case/${report.residentId}/incidents`);
          }}
        />
      </Card>
    </div>
  );
}
