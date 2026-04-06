import { useState } from 'react';
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
import type { Donation } from '../../types/models';
import type { PagedResult } from '../../types/api';

const selectClass =
  'w-full rounded-lg border border-slate-navy/20 bg-white px-3 py-2 text-sm text-slate-navy focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-slate-navy dark:text-white';
const checkboxClass =
  'h-4 w-4 rounded border-slate-navy/20 text-golden-honey focus:ring-golden-honey/40';
const textareaClass =
  'w-full rounded-lg border border-slate-navy/20 bg-white px-3 py-2 text-sm text-slate-navy placeholder:text-warm-gray/60 focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-slate-navy dark:text-white';

function formatDate(d: string | null | undefined): string {
  if (!d) return '--';
  try {
    return format(parseISO(d), 'MMM d, yyyy');
  } catch {
    return d;
  }
}

const donationTypes = ['Monetary', 'InKind', 'Time', 'Skills', 'SocialMedia'] as const;

function donationTypeVariant(t: string): 'success' | 'info' | 'warning' | 'neutral' {
  switch (t) {
    case 'Monetary': return 'success';
    case 'InKind': return 'warning';
    case 'Time': return 'info';
    case 'Skills': return 'neutral';
    case 'SocialMedia': return 'neutral';
    default: return 'neutral';
  }
}

const donationSchema = z.object({
  supporterId: z.coerce.number().min(1, 'Required'),
  donationType: z.string().min(1, 'Required'),
  donationDate: z.string().min(1, 'Required'),
  isRecurring: z.boolean().default(false),
  campaignName: z.string().nullable().optional(),
  channelSource: z.string().optional().default(''),
  currencyCode: z.string().nullable().optional(),
  amount: z.coerce.number().nullable().optional(),
  estimatedValue: z.coerce.number().min(0).default(0),
  impactUnit: z.string().optional().default(''),
  notes: z.string().nullable().optional(),
});

type DonationFormData = z.infer<typeof donationSchema>;

export function DonationsList() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDonation, setEditingDonation] = useState<Donation | null>(null);

  const queryParams = new URLSearchParams();
  queryParams.set('page', String(page));
  queryParams.set('pageSize', '20');
  if (typeFilter) queryParams.set('donationType', typeFilter);
  if (campaignFilter) queryParams.set('campaignName', campaignFilter);
  if (dateFrom) queryParams.set('dateFrom', dateFrom);
  if (dateTo) queryParams.set('dateTo', dateTo);

  const { data, isLoading } = useQuery({
    queryKey: ['donations', page, typeFilter, campaignFilter, dateFrom, dateTo],
    queryFn: () =>
      api.get<PagedResult<Donation>>(`/api/donations?${queryParams.toString()}`),
  });

  const donations = data?.items ?? [];

  const createMutation = useMutation({
    mutationFn: (body: DonationFormData) => api.post<Donation>('/api/donations', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donations'] });
      setModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (body: DonationFormData & { donationId: number }) =>
      api.put(`/api/donations/${body.donationId}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donations'] });
      setEditingDonation(null);
      setModalOpen(false);
    },
  });

  function openCreate() {
    setEditingDonation(null);
    setModalOpen(true);
  }

  function openEdit(donation: Donation) {
    setEditingDonation(donation);
    setModalOpen(true);
  }

  function handleFormSubmit(formData: DonationFormData) {
    if (editingDonation) {
      updateMutation.mutate({ ...formData, donationId: editingDonation.donationId });
    } else {
      createMutation.mutate(formData);
    }
  }

  const columns = [
    {
      key: 'donationDate',
      header: 'Date',
      render: (row: Record<string, unknown>) => formatDate(row.donationDate as string),
    },
    {
      key: 'supporterId',
      header: 'Supporter ID',
      render: (row: Record<string, unknown>) => `#${row.supporterId}`,
    },
    {
      key: 'donationType',
      header: 'Type',
      render: (row: Record<string, unknown>) => (
        <Badge variant={donationTypeVariant(row.donationType as string)}>
          {row.donationType as string}
        </Badge>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row: Record<string, unknown>) =>
        row.amount != null
          ? `${row.currencyCode ?? 'PHP'} ${Number(row.amount).toLocaleString()}`
          : '--',
    },
    { key: 'campaignName', header: 'Campaign' },
    { key: 'channelSource', header: 'Channel' },
    {
      key: 'isRecurring',
      header: 'Recurring',
      render: (row: Record<string, unknown>) => (row.isRecurring ? 'Yes' : 'No'),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Donations"
        subtitle="Track all donations and contributions"
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus size={16} />
            Add Donation
          </Button>
        }
      />

      {/* Filters */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-navy dark:text-white">Donation Type</label>
            <select
              className={selectClass}
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Types</option>
              {donationTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <Input
            label="Campaign Name"
            placeholder="Filter by campaign..."
            value={campaignFilter}
            onChange={(e) => {
              setCampaignFilter(e.target.value);
              setPage(1);
            }}
          />
          <Input
            label="Date From"
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
          />
          <Input
            label="Date To"
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </Card>

      <Card>
        <Table
          columns={columns}
          data={donations as unknown as Record<string, unknown>[]}
          loading={isLoading}
          emptyMessage="No donations found."
          page={page}
          totalPages={data?.totalPages ?? 1}
          onPageChange={setPage}
          onRowClick={(row) => openEdit(row as unknown as Donation)}
        />
      </Card>

      {/* Add/Edit Donation Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingDonation(null);
        }}
        title={editingDonation ? 'Edit Donation' : 'Add Donation'}
      >
        <DonationForm
          defaultValues={editingDonation ?? undefined}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setModalOpen(false);
            setEditingDonation(null);
          }}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
          error={
            createMutation.isError
              ? (createMutation.error as Error).message
              : updateMutation.isError
                ? (updateMutation.error as Error).message
                : undefined
          }
        />
      </Modal>
    </div>
  );
}

/* ── Inline Form ─────────────────────────────────────────────── */

function DonationForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
  error,
}: {
  defaultValues?: Partial<Donation>;
  onSubmit: (data: DonationFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  error?: string;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DonationFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(donationSchema) as any,
    defaultValues: {
      supporterId: defaultValues?.supporterId ?? 0,
      donationType: defaultValues?.donationType ?? '',
      donationDate: defaultValues?.donationDate?.split('T')[0] ?? '',
      isRecurring: defaultValues?.isRecurring ?? false,
      campaignName: defaultValues?.campaignName ?? '',
      channelSource: defaultValues?.channelSource ?? '',
      currencyCode: defaultValues?.currencyCode ?? 'PHP',
      amount: defaultValues?.amount ?? null,
      estimatedValue: defaultValues?.estimatedValue ?? 0,
      impactUnit: defaultValues?.impactUnit ?? '',
      notes: defaultValues?.notes ?? '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}
      <Input
        label="Supporter ID"
        type="number"
        error={errors.supporterId?.message}
        {...register('supporterId')}
      />
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-navy dark:text-white">Donation Type</label>
        <select className={selectClass} {...register('donationType')}>
          <option value="">Select...</option>
          {donationTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {errors.donationType?.message && (
          <p className="text-xs text-red-600">{errors.donationType.message}</p>
        )}
      </div>
      <Input
        label="Donation Date"
        type="date"
        error={errors.donationDate?.message}
        {...register('donationDate')}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Currency Code" {...register('currencyCode')} />
        <Input label="Amount" type="number" step="0.01" {...register('amount')} />
      </div>
      <Input label="Estimated Value" type="number" step="0.01" {...register('estimatedValue')} />
      <Input label="Campaign Name" {...register('campaignName')} />
      <Input label="Channel Source" {...register('channelSource')} />
      <Input label="Impact Unit" {...register('impactUnit')} />
      <label className="flex items-center gap-2 text-sm text-slate-navy dark:text-white">
        <input
          type="checkbox"
          className={checkboxClass}
          checked={watch('isRecurring')}
          onChange={(e) => setValue('isRecurring', e.target.checked)}
        />
        Recurring Donation
      </label>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-navy dark:text-white">Notes</label>
        <textarea className={textareaClass} rows={2} {...register('notes')} />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {defaultValues ? 'Update Donation' : 'Create Donation'}
        </Button>
      </div>
    </form>
  );
}
