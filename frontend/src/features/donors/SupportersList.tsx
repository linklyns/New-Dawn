import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { Plus } from 'lucide-react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import type { Supporter } from '../../types/models';
import type { PagedResult } from '../../types/api';
import type { SupporterLikelihood } from '../../types/predictions';

const selectClass =
  'w-full rounded-lg border border-slate-navy/20 bg-white px-3 py-2 text-sm text-slate-navy focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-slate-navy dark:text-white';

function formatDate(d: string | null | undefined): string {
  if (!d) return '--';
  try {
    return format(parseISO(d), 'MMM d, yyyy');
  } catch {
    return d;
  }
}

const supporterTypes = ['MonetaryDonor', 'Volunteer', 'InKindDonor', 'SocialMediaAdvocate'] as const;
const statusOptions = ['Active', 'Inactive', 'Lapsed'] as const;

function typeVariant(t: string): 'success' | 'info' | 'warning' | 'neutral' {
  switch (t) {
    case 'MonetaryDonor': return 'success';
    case 'Volunteer': return 'info';
    case 'InKindDonor': return 'warning';
    case 'SocialMediaAdvocate': return 'neutral';
    default: return 'neutral';
  }
}

function statusVariant(s: string): 'success' | 'neutral' | 'danger' {
  switch (s) {
    case 'Active': return 'success';
    case 'Inactive': return 'neutral';
    case 'Lapsed': return 'danger';
    default: return 'neutral';
  }
}

const supporterSchema = z.object({
  supporterType: z.string().min(1, 'Required'),
  displayName: z.string().min(1, 'Required'),
  organizationName: z.string().nullable().optional(),
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  relationshipType: z.string().optional().default(''),
  region: z.string().optional().default(''),
  country: z.string().optional().default(''),
  email: z.string().email('Valid email required'),
  phone: z.string().optional().default(''),
  status: z.string().min(1, 'Required'),
  firstDonationDate: z.string().optional().default(''),
  acquisitionChannel: z.string().optional().default(''),
});

type SupporterFormData = z.infer<typeof supporterSchema>;

export function SupportersList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const queryParams = new URLSearchParams();
  queryParams.set('page', String(page));
  queryParams.set('pageSize', '20');
  if (typeFilter) queryParams.set('supporterType', typeFilter);
  if (statusFilter) queryParams.set('status', statusFilter);
  if (search) queryParams.set('search', search);

  const { data, isLoading } = useQuery({
    queryKey: ['supporters', page, typeFilter, statusFilter, search],
    queryFn: () =>
      api.get<PagedResult<Supporter>>(`/api/supporters?${queryParams.toString()}`),
  });

  const supporters = data?.items ?? [];

  const { data: likelihoodResp } = useQuery({
    queryKey: ['supporter-likelihood'],
    queryFn: () => api.get<{ items: SupporterLikelihood[] }>('/api/predictions/ml/supporter-likelihood'),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  const likelihoodMap = new Map(
    (likelihoodResp?.items ?? []).map((l) => [l.supporterId, l]),
  );

  const createMutation = useMutation({
    mutationFn: (body: SupporterFormData) => api.post<Supporter>('/api/supporters', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supporters'] });
      setModalOpen(false);
    },
  });

  const columns = [
    { key: 'displayName', header: 'Display Name' },
    { key: 'organizationName', header: 'Organization' },
    {
      key: 'supporterType',
      header: 'Type',
      render: (row: Record<string, unknown>) => (
        <Badge variant={typeVariant(row.supporterType as string)}>
          {row.supporterType as string}
        </Badge>
      ),
    },
    { key: 'email', header: 'Email' },
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
      key: 'firstDonationDate',
      header: 'First Donation',
      render: (row: Record<string, unknown>) => formatDate(row.firstDonationDate as string),
    },
    { key: 'acquisitionChannel', header: 'Channel' },
    {
      key: 'likelihood',
      header: 'Likelihood',
      render: (row: Record<string, unknown>) => {
        const pred = likelihoodMap.get((row as unknown as Supporter).supporterId);
        if (!pred) return <span className="text-xs text-warm-gray">--</span>;
        const variant =
          pred.likelihoodCategory === 'High' ? 'success'
          : pred.likelihoodCategory === 'Medium' ? 'info'
          : 'neutral';
        return (
          <Badge variant={variant}>
            {pred.likelihoodCategory} ({(pred.likelihoodScore * 100).toFixed(0)}%)
          </Badge>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Supporters"
        subtitle="Manage donor and supporter relationships"
        action={
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus size={16} />
            Add Supporter
          </Button>
        }
      />

      {/* Filters */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-navy dark:text-white">Supporter Type</label>
            <select
              className={selectClass}
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Types</option>
              {supporterTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-navy dark:text-white">Status</label>
            <select
              className={selectClass}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <Input
            label="Search"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </Card>

      <Card>
        <Table
          columns={columns}
          data={supporters as unknown as Record<string, unknown>[]}
          loading={isLoading}
          emptyMessage="No supporters found."
          page={page}
          totalPages={data?.totalPages ?? 1}
          onPageChange={setPage}
          onRowClick={(row) =>
            navigate(`/admin/supporters/${(row as unknown as Supporter).supporterId}`)
          }
        />
      </Card>

      {/* Add Supporter Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Supporter"
      >
        <SupporterForm
          onSubmit={(formData) => createMutation.mutate(formData)}
          onCancel={() => setModalOpen(false)}
          isSubmitting={createMutation.isPending}
          error={createMutation.isError ? (createMutation.error as Error).message : undefined}
        />
      </Modal>
    </div>
  );
}

/* ── Inline Form ─────────────────────────────────────────────── */

function SupporterForm({
  onSubmit,
  onCancel,
  isSubmitting,
  error,
}: {
  onSubmit: (data: SupporterFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  error?: string;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SupporterFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(supporterSchema) as any,
    defaultValues: {
      supporterType: '',
      displayName: '',
      organizationName: '',
      firstName: '',
      lastName: '',
      relationshipType: '',
      region: '',
      country: '',
      email: '',
      phone: '',
      status: 'Active',
      firstDonationDate: '',
      acquisitionChannel: '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Input label="First Name" error={errors.firstName?.message} {...register('firstName')} />
        <Input label="Last Name" error={errors.lastName?.message} {...register('lastName')} />
      </div>
      <Input label="Display Name" error={errors.displayName?.message} {...register('displayName')} />
      <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-navy dark:text-white">Supporter Type</label>
        <select className={selectClass} {...register('supporterType')}>
          <option value="">Select...</option>
          {supporterTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {errors.supporterType?.message && (
          <p className="text-xs text-red-600">{errors.supporterType.message}</p>
        )}
      </div>
      <Input label="Organization" {...register('organizationName')} />
      <Input label="Phone" {...register('phone')} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Region" {...register('region')} />
        <Input label="Country" {...register('country')} />
      </div>
      <Input label="Acquisition Channel" {...register('acquisitionChannel')} />
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Create Supporter
        </Button>
      </div>
    </form>
  );
}
