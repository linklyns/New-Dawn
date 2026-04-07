import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { Plus, Trash2, ArrowUpDown } from 'lucide-react';
import { api } from '../../lib/api';
import { useDebounce } from '../../hooks/useDebounce';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import type { Donation, Supporter } from '../../types/models';
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

const deleteReasonSchema = z.object({
  reason: z.string().min(1, 'A reason is required to delete this donation'),
});
type DeleteReasonData = z.infer<typeof deleteReasonSchema>;

export function DonationsList() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDonation, setEditingDonation] = useState<Donation | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const queryParams = new URLSearchParams();
  queryParams.set('page', String(page));
  queryParams.set('pageSize', '20');
  queryParams.set('sortBy', sortBy);
  queryParams.set('sortDir', sortDir);
  if (typeFilter) queryParams.set('donationType', typeFilter);
  if (debouncedSearch) queryParams.set('search', debouncedSearch);
  if (dateFrom) queryParams.set('dateFrom', dateFrom);
  if (dateTo) queryParams.set('dateTo', dateTo);

  const { data, isLoading } = useQuery({
    queryKey: ['donations', page, typeFilter, debouncedSearch, dateFrom, dateTo, sortBy, sortDir],
    queryFn: () =>
      api.get<PagedResult<Donation>>(`/api/donations?${queryParams.toString()}`),
  });

  const { data: supportersData } = useQuery({
    queryKey: ['supporters-all'],
    queryFn: () => api.get<PagedResult<Supporter>>('/api/supporters?pageSize=500'),
  });

  const supporters = supportersData?.items ?? [];
  const supporterMap = new Map(supporters.map((s) => [s.supporterId, s.displayName]));

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

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/donations/${id}?confirm=true`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donations'] });
      setDeleteConfirmOpen(false);
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

  function handleDeleteRequest() {
    setModalOpen(false);
    setDeleteConfirmOpen(true);
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
      header: 'Supporter',
      render: (row: Record<string, unknown>) => {
        const id = row.supporterId as number;
        const name = supporterMap.get(id);
        return name ?? `#${id}`;
      },
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
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                label="Search"
                placeholder="Search by name, type, campaign, channel, notes…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <div className="flex flex-col gap-1 sm:w-44">
              <label className="text-sm font-medium text-slate-navy dark:text-white">Type</label>
              <select
                className={selectClass}
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Types</option>
                {donationTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 sm:w-52">
              <label className="text-sm font-medium text-slate-navy dark:text-white">Sort</label>
              <div className="flex gap-1">
                <select
                  className={selectClass}
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                >
                  <option value="date">Date</option>
                  <option value="amount">Amount</option>
                  <option value="type">Type</option>
                  <option value="supporter">Supporter</option>
                </select>
                <button
                  type="button"
                  title={sortDir === 'desc' ? 'Descending' : 'Ascending'}
                  onClick={() => { setSortDir(d => d === 'desc' ? 'asc' : 'desc'); setPage(1); }}
                  className="flex items-center justify-center rounded-lg border border-slate-navy/20 bg-white px-2 text-slate-navy hover:bg-slate-navy/5 dark:border-white/20 dark:bg-slate-navy dark:text-white"
                >
                  <ArrowUpDown size={15} className={sortDir === 'asc' ? 'rotate-180' : ''} />
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              label="Date From"
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            />
            <Input
              label="Date To"
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            />
            {(search || typeFilter || dateFrom || dateTo) && (
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => { setSearch(''); setTypeFilter(''); setDateFrom(''); setDateTo(''); setPage(1); }}
                  className="text-sm text-slate-navy/60 underline hover:text-slate-navy dark:text-white/60 dark:hover:text-white"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
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
          key={editingDonation?.donationId ?? 'new'}
          defaultValues={editingDonation ?? undefined}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setModalOpen(false);
            setEditingDonation(null);
          }}
          onDeleteRequest={handleDeleteRequest}
          isEditing={!!editingDonation}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
          supporters={supporters}
          error={
            createMutation.isError
              ? (createMutation.error as Error).message
              : updateMutation.isError
                ? (updateMutation.error as Error).message
                : undefined
          }
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setModalOpen(true);
        }}
        title="Delete Donation"
      >
        <DeleteConfirmForm
          donation={editingDonation}
          supporterName={editingDonation ? (supporterMap.get(editingDonation.supporterId) ?? `#${editingDonation.supporterId}`) : ''}
          onConfirm={() => editingDonation && deleteMutation.mutate(editingDonation.donationId)}
          onCancel={() => {
            setDeleteConfirmOpen(false);
            setModalOpen(true);
          }}
          isDeleting={deleteMutation.isPending}
          error={deleteMutation.isError ? (deleteMutation.error as Error).message : undefined}
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
  onDeleteRequest,
  isEditing,
  isSubmitting,
  error,
  supporters,
}: {
  defaultValues?: Partial<Donation>;
  onSubmit: (data: DonationFormData) => void;
  onCancel: () => void;
  onDeleteRequest: () => void;
  isEditing: boolean;
  isSubmitting: boolean;
  error?: string;
  supporters: Supporter[];
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
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-navy dark:text-white">Supporter</label>
        <select
          className={selectClass}
          value={watch('supporterId') || ''}
          onChange={(e) => setValue('supporterId', Number(e.target.value))}
        >
          <option value="">Select supporter...</option>
          {supporters.map((s) => (
            <option key={s.supporterId} value={s.supporterId}>
              {s.displayName}
            </option>
          ))}
        </select>
        {errors.supporterId?.message && (
          <p className="text-xs text-red-600">{errors.supporterId.message}</p>
        )}
      </div>
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
        <label className="text-sm font-medium text-slate-navy dark:text-white">
          Notes{isEditing && <span className="ml-1 text-red-500">*</span>}
        </label>
        <textarea
          className={textareaClass}
          rows={2}
          placeholder={isEditing ? 'Required — describe what changed and why' : 'Optional notes'}
          {...register('notes', {
            validate: isEditing
              ? (v) => (!!v && v.trim().length > 0) || 'Notes are required when updating a donation'
              : undefined,
          })}
        />
        {errors.notes?.message && (
          <p className="text-xs text-red-600">{errors.notes.message}</p>
        )}
      </div>
      <div className="flex items-center justify-between pt-2">
        <div>
          {isEditing && (
            <Button variant="ghost" type="button" onClick={onDeleteRequest} className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
              <Trash2 size={15} className="mr-1" />
              Delete
            </Button>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isEditing ? 'Update Donation' : 'Create Donation'}
          </Button>
        </div>
      </div>
    </form>
  );
}

/* ── Delete Confirmation Form ────────────────────────────────── */

function DeleteConfirmForm({
  donation,
  supporterName,
  onConfirm,
  onCancel,
  isDeleting,
  error,
}: {
  donation: Donation | null;
  supporterName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
  error?: string;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DeleteReasonData>({
    resolver: zodResolver(deleteReasonSchema),
  });

  if (!donation) return null;

  return (
    <form onSubmit={handleSubmit(onConfirm)} className="space-y-4">
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
        This will permanently delete the donation from{' '}
        <strong>{supporterName}</strong> on{' '}
        <strong>{formatDate(donation.donationDate)}</strong>
        {donation.amount != null && (
          <> — <strong>{donation.currencyCode ?? 'PHP'} {Number(donation.amount).toLocaleString()}</strong></>
        )}
        . This action cannot be undone.
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-navy dark:text-white">
          Reason for deletion <span className="text-red-500">*</span>
        </label>
        <textarea
          className={textareaClass}
          rows={3}
          placeholder="Explain why this donation is being deleted..."
          {...register('reason')}
        />
        {errors.reason?.message && (
          <p className="text-xs text-red-600">{errors.reason.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-1">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          loading={isDeleting}
          className="bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white"
        >
          Confirm Delete
        </Button>
      </div>
    </form>
  );
}
