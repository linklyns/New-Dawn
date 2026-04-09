import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { ArrowUpDown, Plus, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { getPageSizeOptions } from '../../lib/pagination';
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
import { useAuthStore } from '../../stores/authStore';

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
  impactUnit: z.string().optional().default(''),
  skillType: z.string().optional().default(''),
  availability: z.string().optional().default(''),
  timesPerWeek: z.coerce.number().nullable().optional(),
  inKindItem: z.string().optional().default(''),
  inKindQuantity: z.coerce.number().nullable().optional(),
  inKindCondition: z.string().optional().default(''),
  socialPlatform: z.string().optional().default(''),
  socialPostUrl: z.string().optional().default(''),
  expectedReach: z.coerce.number().nullable().optional(),
  notes: z.string().nullable().optional(),
}).superRefine((value, ctx) => {
  if (value.donationType === 'Monetary') {
    if (value.amount == null || Number(value.amount) <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amount'],
        message: 'Amount is required for monetary donations',
      });
    }
    if (!value.currencyCode || value.currencyCode.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['currencyCode'],
        message: 'Currency code is required for monetary donations',
      });
    }
  }

  if (value.donationType === 'Skills' && (!value.skillType || value.skillType.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['skillType'],
      message: 'Please specify the skill type',
    });
  }

  if (value.donationType === 'Time') {
    if (!value.availability || value.availability.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['availability'],
        message: 'Availability is required for time donations',
      });
    }
    if (value.timesPerWeek == null || Number(value.timesPerWeek) <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['timesPerWeek'],
        message: 'Times per week is required for time donations',
      });
    }
  }

  if (value.donationType === 'InKind') {
    if (!value.inKindItem || value.inKindItem.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['inKindItem'],
        message: 'Please describe the in-kind donation item',
      });
    }
    if (value.inKindQuantity == null || Number(value.inKindQuantity) <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['inKindQuantity'],
        message: 'Quantity is required for in-kind donations',
      });
    }
  }

  if (value.donationType === 'SocialMedia') {
    if (!value.socialPlatform || value.socialPlatform.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['socialPlatform'],
        message: 'Platform is required for social media donations',
      });
    }
    if (!value.socialPostUrl || value.socialPostUrl.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['socialPostUrl'],
        message: 'Post URL or handle is required for social media donations',
      });
    }
  }
});

type DonationFormData = z.infer<typeof donationSchema>;

type DonationPayload = {
  supporterId: number;
  donationType: string;
  donationDate: string;
  isRecurring: boolean;
  campaignName: string | null;
  channelSource: string;
  currencyCode: string | null;
  amount: number | null;
  estimatedValue: number;
  impactUnit: string;
  notes: string | null;
  referralPostId: number | null;
};

function getImpactUnitByType(type: string): string {
  switch (type) {
    case 'Monetary': return 'pesos';
    case 'InKind': return 'items';
    case 'Time': return 'hours';
    case 'Skills': return 'skills';
    case 'SocialMedia': return 'engagement';
    default: return '';
  }
}

function normalizeDonationPayload(formData: DonationFormData): DonationPayload {
  const isMonetary = formData.donationType === 'Monetary';
  const details: string[] = [];

  if (formData.donationType === 'Skills' && formData.skillType?.trim()) {
    details.push(`Skill Type: ${formData.skillType.trim()}`);
  }
  if (formData.donationType === 'Time') {
    if (formData.availability?.trim()) {
      details.push(`Availability: ${formData.availability.trim()}`);
    }
    if (formData.timesPerWeek != null && Number(formData.timesPerWeek) > 0) {
      details.push(`Times Per Week: ${Number(formData.timesPerWeek)}`);
    }
  }
  if (formData.donationType === 'InKind') {
    if (formData.inKindItem?.trim()) {
      details.push(`In-Kind Item: ${formData.inKindItem.trim()}`);
    }
    if (formData.inKindQuantity != null && Number(formData.inKindQuantity) > 0) {
      details.push(`Quantity: ${Number(formData.inKindQuantity)}`);
    }
    if (formData.inKindCondition?.trim()) {
      details.push(`Condition: ${formData.inKindCondition.trim()}`);
    }
  }
  if (formData.donationType === 'SocialMedia') {
    if (formData.socialPlatform?.trim()) {
      details.push(`Platform: ${formData.socialPlatform.trim()}`);
    }
    if (formData.socialPostUrl?.trim()) {
      details.push(`Post URL/Handle: ${formData.socialPostUrl.trim()}`);
    }
    if (formData.expectedReach != null && Number(formData.expectedReach) > 0) {
      details.push(`Expected Reach: ${Number(formData.expectedReach)}`);
    }
  }

  const notesParts = [formData.notes?.trim()]
    .filter((n): n is string => !!n && n.length > 0);
  if (details.length > 0) {
    notesParts.push(`[Donation Details] ${details.join(' | ')}`);
  }

  const amount = isMonetary ? Number(formData.amount ?? 0) : null;

  return {
    supporterId: Number(formData.supporterId),
    donationType: formData.donationType,
    donationDate: formData.donationDate,
    isRecurring: !!formData.isRecurring,
    campaignName: formData.campaignName?.trim() || null,
    channelSource: formData.channelSource?.trim() || '',
    currencyCode: isMonetary ? (formData.currencyCode?.trim() || 'PHP') : null,
    amount,
    estimatedValue: isMonetary ? Number(amount ?? 0) : 0,
    impactUnit: getImpactUnitByType(formData.donationType),
    notes: notesParts.length > 0 ? notesParts.join('\n\n') : null,
    referralPostId: null,
  };
}

const deleteReasonSchema = z.object({
  reason: z.string().min(1, 'A reason is required to delete this donation'),
});
type DeleteReasonData = z.infer<typeof deleteReasonSchema>;

export function DonationsList() {
  const queryClient = useQueryClient();
  const userRole = useAuthStore((s) => s.user?.role ?? '');
  const [searchParams, setSearchParams] = useSearchParams();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDonation, setEditingDonation] = useState<Donation | null>(null);
  const [createPrefill, setCreatePrefill] = useState<Partial<Donation> | undefined>(undefined);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const queryParams = new URLSearchParams();
  queryParams.set('page', String(page));
  queryParams.set('pageSize', String(pageSize));
  queryParams.set('sortBy', sortBy);
  queryParams.set('sortDir', sortDir);
  if (typeFilter) queryParams.set('donationType', typeFilter);
  if (debouncedSearch) queryParams.set('search', debouncedSearch);
  if (dateFrom) queryParams.set('dateFrom', dateFrom);
  if (dateTo) queryParams.set('dateTo', dateTo);

  const { data, isLoading } = useQuery({
    queryKey: ['donations', page, pageSize, typeFilter, debouncedSearch, dateFrom, dateTo, sortBy, sortDir],
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

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page when changing page size
  };

  const createMutation = useMutation({
    mutationFn: (body: DonationPayload) => api.post<Donation>('/api/donations', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donations'] });
      setModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (body: DonationPayload & { donationId: number }) =>
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

  function openCreate(prefill?: Partial<Donation>) {
    setEditingDonation(null);
    setCreatePrefill(prefill);
    setModalOpen(true);
  }

  function openEdit(donation: Donation) {
    setEditingDonation(donation);
    setCreatePrefill(undefined);
    setModalOpen(true);
  }

  function handleDeleteRequest() {
    setModalOpen(false);
    setDeleteConfirmOpen(true);
  }

  useEffect(() => {
    if (searchParams.get('openNew') !== '1') return;
    if (!supportersData) return;

    const parsedAmount = Number(searchParams.get('amount') ?? '');
    const amount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : null;
    const donationType = searchParams.get('donationType') || 'Monetary';
    const channelSource = searchParams.get('channelSource') || 'Website';
    const today = new Date().toISOString().slice(0, 10);
    const defaultSupporterId = userRole === 'Admin' ? 0 : (supporters[0]?.supporterId ?? 0);

    openCreate({
      supporterId: defaultSupporterId,
      donationType,
      donationDate: today,
      isRecurring: false,
      campaignName: '',
      channelSource,
      currencyCode: 'PHP',
      amount,
      notes: '',
    });

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('openNew');
      next.delete('amount');
      next.delete('donationType');
      next.delete('channelSource');
      return next;
    }, { replace: true });
  }, [searchParams, setSearchParams, supportersData, supporters, userRole]);

  function handleFormSubmit(formData: DonationFormData) {
    const payload = normalizeDonationPayload(formData);
    if (editingDonation) {
      updateMutation.mutate({ ...payload, donationId: editingDonation.donationId });
    } else {
      createMutation.mutate(payload);
    }
  }

  const columns = useMemo(() => [
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
    ...(userRole === 'Admin' ? [{
      key: 'actions',
      header: '',
      render: (row: Record<string, unknown>) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(row as unknown as Donation); }}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" className="text-red-600" onClick={(e) => {
            e.stopPropagation();
            const donation = row as unknown as Donation;
            setEditingDonation(donation);
            setDeleteConfirmOpen(true);
          }}>
            Delete
          </Button>
        </div>
      ),
    }] : []),
  ], [supporterMap, userRole]);

  return (
    <div>
      <PageHeader
        title="Donations"
        subtitle="Track all donations and contributions"
        action={
          <Button size="sm" onClick={() => openCreate()}>
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
          pageSize={pageSize}
          totalPages={data?.totalPages ?? 1}
          totalCount={data?.totalCount}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={getPageSizeOptions(data?.totalCount)}
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
        hideFooter
      >
        <DonationForm
          key={editingDonation?.donationId ?? `${createPrefill?.amount ?? 'new'}-${createPrefill?.donationType ?? ''}`}
          defaultValues={editingDonation ?? createPrefill ?? undefined}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setModalOpen(false);
            setEditingDonation(null);
          }}
          onDeleteRequest={handleDeleteRequest}
          isEditing={!!editingDonation}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
          supporters={supporters}
          userRole={userRole}
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
        hideFooter
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
  userRole,
}: {
  defaultValues?: Partial<Donation>;
  onSubmit: (data: DonationFormData) => void;
  onCancel: () => void;
  onDeleteRequest: () => void;
  isEditing: boolean;
  isSubmitting: boolean;
  error?: string;
  supporters: Supporter[];
  userRole: string;
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
      impactUnit: defaultValues?.impactUnit ?? '',
      skillType: '',
      availability: '',
      timesPerWeek: null,
      inKindItem: '',
      inKindQuantity: null,
      inKindCondition: '',
      socialPlatform: '',
      socialPostUrl: '',
      expectedReach: null,
      notes: defaultValues?.notes ?? '',
    },
  });

  const donationType = watch('donationType');
  const isMonetary = donationType === 'Monetary';

  useEffect(() => {
    if (userRole !== 'Admin' && supporters.length > 0) {
      setValue('supporterId', supporters[0].supporterId);
    }
  }, [userRole, supporters, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}
      {userRole === 'Admin' ? (
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
      ) : (
        <div className="rounded-lg border border-sky-blue/30 bg-sky-blue/10 p-2 text-sm text-slate-navy dark:border-sky-blue/40 dark:bg-sky-blue/10 dark:text-white">
          Donating as: <span className="font-semibold">{supporters[0]?.displayName ?? 'Your account'}</span>
        </div>
      )}
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
      {isMonetary ? (
        <div className="grid grid-cols-2 gap-3">
          <Input label="Currency Code" error={errors.currencyCode?.message} {...register('currencyCode')} />
          <Input label="Amount" type="number" step="0.01" error={errors.amount?.message} {...register('amount')} />
        </div>
      ) : null}

      {donationType === 'InKind' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="In-Kind Item"
            placeholder="e.g., school kits, hygiene packs"
            error={errors.inKindItem?.message}
            {...register('inKindItem')}
          />
          <Input
            label="Quantity"
            type="number"
            min="1"
            error={errors.inKindQuantity?.message}
            {...register('inKindQuantity')}
          />
          <Input
            label="Condition"
            placeholder="e.g., new, gently used"
            error={errors.inKindCondition?.message}
            {...register('inKindCondition')}
          />
        </div>
      )}

      {donationType === 'Skills' && (
        <Input
          label="Skill Type"
          placeholder="e.g., tutoring, legal aid, counseling, design"
          error={errors.skillType?.message}
          {...register('skillType')}
        />
      )}

      {donationType === 'Time' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Availability"
            placeholder="e.g., Weekdays 3-6 PM"
            error={errors.availability?.message}
            {...register('availability')}
          />
          <Input
            label="Times Per Week"
            type="number"
            min="1"
            error={errors.timesPerWeek?.message}
            {...register('timesPerWeek')}
          />
        </div>
      )}

      {donationType === 'SocialMedia' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Platform"
            placeholder="e.g., Facebook, Instagram, TikTok"
            error={errors.socialPlatform?.message}
            {...register('socialPlatform')}
          />
          <Input
            label="Post URL or Handle"
            placeholder="e.g., https://... or @account"
            error={errors.socialPostUrl?.message}
            {...register('socialPostUrl')}
          />
          <Input
            label="Expected Reach"
            type="number"
            min="1"
            placeholder="Estimated people reached"
            error={errors.expectedReach?.message}
            {...register('expectedReach')}
          />
        </div>
      )}

      <Input label="Campaign Name" {...register('campaignName')} />
      <Input label="Channel Source" {...register('channelSource')} />
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
