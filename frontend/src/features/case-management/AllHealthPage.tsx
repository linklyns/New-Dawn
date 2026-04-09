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

export function AllHealthPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data, isLoading } = useQuery({
    queryKey: ['all-health-records', page, pageSize],
    queryFn: () =>
      api.get<PagedResult<HealthWellbeingRecord>>(
        `/api/health-records?page=${page}&pageSize=${pageSize}`,
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
    {
      key: 'recordDate',
      header: 'Date',
      render: (row: Record<string, unknown>) => formatDate(row.recordDate as string),
    },
    {
      key: 'generalHealthScore',
      header: 'Health',
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
        <Table
          columns={columns}
          data={(data?.items ?? []) as unknown as Record<string, unknown>[]}
          loading={isLoading}
          emptyMessage="No health records found."
          page={page}
          pageSize={pageSize}
          totalPages={data?.totalPages ?? 1}
          totalCount={data?.totalCount}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={getPageSizeOptions(data?.totalCount)}
          onRowClick={(row) => {
            const rec = row as unknown as HealthWellbeingRecord;
            navigate(`/admin/case/${rec.residentId}/health`);
          }}
        />
      </Card>
    </div>
  );
}
