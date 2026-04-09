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
import type { EducationRecord } from '../../types/models';
import type { PagedResult } from '../../types/api';

function formatDate(d: string | null | undefined): string {
  if (!d) return '--';
  try {
    return format(parseISO(d), 'MMM d, yyyy');
  } catch {
    return d;
  }
}

function statusVariant(s: string): 'success' | 'warning' | 'info' | 'neutral' {
  switch (s) {
    case 'Completed': return 'success';
    case 'InProgress': return 'info';
    case 'NotStarted': return 'neutral';
    case 'Dropped': return 'warning';
    default: return 'neutral';
  }
}

export function AllEducationPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data, isLoading } = useQuery({
    queryKey: ['all-education-records', page, pageSize],
    queryFn: () =>
      api.get<PagedResult<EducationRecord>>(
        `/api/education-records?page=${page}&pageSize=${pageSize}`,
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
    { key: 'educationLevel', header: 'Level' },
    { key: 'schoolName', header: 'School' },
    { key: 'enrollmentStatus', header: 'Enrollment' },
    {
      key: 'attendanceRate',
      header: 'Attendance',
      render: (row: Record<string, unknown>) => `${row.attendanceRate}%`,
    },
    {
      key: 'progressPercent',
      header: 'Progress',
      render: (row: Record<string, unknown>) => `${row.progressPercent}%`,
    },
    {
      key: 'completionStatus',
      header: 'Status',
      render: (row: Record<string, unknown>) => (
        <Badge variant={statusVariant(row.completionStatus as string)}>
          {row.completionStatus as string}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Education Records"
        subtitle="All education records across residents"
      />

      <Card>
        <Table
          columns={columns}
          data={(data?.items ?? []) as unknown as Record<string, unknown>[]}
          loading={isLoading}
          emptyMessage="No education records found."
          page={page}
          pageSize={pageSize}
          totalPages={data?.totalPages ?? 1}
          totalCount={data?.totalCount}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={getPageSizeOptions(data?.totalCount)}
          onRowClick={(row) => {
            const rec = row as unknown as EducationRecord;
            navigate(`/admin/case/${rec.residentId}/education`);
          }}
        />
      </Card>
    </div>
  );
}
