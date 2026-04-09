import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { api } from '../../lib/api';
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

export function AllIncidentsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data, isLoading } = useQuery({
    queryKey: ['all-incident-reports', page, pageSize],
    queryFn: () =>
      api.get<PagedResult<IncidentReport>>(
        `/api/incident-reports?page=${page}&pageSize=${pageSize}`,
      ),
  });

  const { residentMap } = useResidentMap();

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page when changing page size
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
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft size={16} />
            Back
          </Button>
        }
      />

      <Card>
        <Table
          columns={columns}
          data={(data?.items ?? []) as unknown as Record<string, unknown>[]}
          loading={isLoading}
          emptyMessage="No incident reports found."
          page={page}
          pageSize={pageSize}
          totalPages={data?.totalPages ?? 1}
          totalCount={data?.totalCount}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={getPageSizeOptions(data?.totalCount)}
          onRowClick={(row) => {
            const report = row as unknown as IncidentReport;
            navigate(`/admin/case/${report.residentId}/incidents`);
          }}
        />
      </Card>
    </div>
  );
}
