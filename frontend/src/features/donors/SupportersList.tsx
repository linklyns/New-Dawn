import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowUpDown, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDebounce } from '../../hooks/useDebounce';
import { api } from '../../lib/api';
import { getPageSizeOptions } from '../../lib/pagination';
import { formatLocalizedDate } from '../../lib/locale';
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
  return formatLocalizedDate(d);
}

const supporterTypes = ['MonetaryDonor', 'Volunteer', 'InKindDonor', 'SocialMediaAdvocate'] as const;
const statusOptions = ['Active', 'Inactive', 'Lapsed'] as const;

function getSupporterTypeLabel(type: string, t: (key: string) => string): string {
  switch (type) {
    case 'MonetaryDonor': return t('donors.monetaryDonor');
    case 'Volunteer': return t('donors.volunteer');
    case 'InKindDonor': return t('donors.inKindDonor');
    case 'SocialMediaAdvocate': return t('donors.socialMediaAdvocate');
    default: return type;
  }
}

function getStatusLabel(status: string, t: (key: string) => string): string {
  switch (status) {
    case 'Active': return t('common.active');
    case 'Inactive': return t('common.inactive');
    case 'Lapsed': return t('donors.lapsed');
    default: return status;
  }
}

function getLikelihoodLabel(category: string, t: (key: string) => string): string {
  switch (category) {
    case 'High': return t('caseManagement.high');
    case 'Medium': return t('caseManagement.medium');
    case 'Low': return t('caseManagement.low');
    default: return category;
  }
}

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

function createSupporterSchema(t: (key: string) => string) {
  return z.object({
    supporterType: z.string().min(1, t('common.required')),
    displayName: z.string().min(1, t('common.required')),
    organizationName: z.string().nullable().optional(),
    firstName: z.string().min(1, t('common.required')),
    lastName: z.string().min(1, t('common.required')),
    relationshipType: z.string().optional().default(''),
    region: z.string().optional().default(''),
    country: z.string().optional().default(''),
    email: z.string().email(t('auth.emailInvalid')),
    phone: z.string().optional().default(''),
    status: z.string().min(1, t('common.required')),
    firstDonationDate: z.string().optional().default(''),
    acquisitionChannel: z.string().optional().default(''),
  });
}

type SupporterFormData = z.infer<ReturnType<typeof createSupporterSchema>>;

export function SupportersList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [modalOpen, setModalOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const queryParams = new URLSearchParams();
  queryParams.set('page', String(page));
  queryParams.set('pageSize', String(pageSize));
  if (typeFilter) queryParams.set('supporterType', typeFilter);
  if (statusFilter) queryParams.set('status', statusFilter);
  if (debouncedSearch) queryParams.set('search', debouncedSearch);
  if (sortBy !== 'likelihood') {
    queryParams.set('sortBy', sortBy);
    queryParams.set('sortDir', sortDir);
  }

  const { data, isLoading } = useQuery({
    queryKey: ['supporters', page, pageSize, typeFilter, statusFilter, debouncedSearch, sortBy, sortDir],
    queryFn: () =>
      api.get<PagedResult<Supporter>>(`/api/supporters?${queryParams.toString()}`),
  });

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page when changing page size
  };

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
    { key: 'displayName', header: t('donors.displayName') },
    { key: 'organizationName', header: t('donors.organization') },
    {
      key: 'supporterType',
      header: t('common.type'),
      render: (row: Record<string, unknown>) => (
        <Badge variant={typeVariant(row.supporterType as string)}>
          {getSupporterTypeLabel(row.supporterType as string, t)}
        </Badge>
      ),
    },
    { key: 'email', header: t('common.email') },
    {
      key: 'status',
      header: t('common.status'),
      render: (row: Record<string, unknown>) => (
        <Badge variant={statusVariant(row.status as string)}>
          {getStatusLabel(row.status as string, t)}
        </Badge>
      ),
    },
    {
      key: 'firstDonationDate',
      header: t('donors.firstDonation'),
      render: (row: Record<string, unknown>) => formatDate(row.firstDonationDate as string),
    },
    { key: 'acquisitionChannel', header: t('donors.channel') },
    {
      key: 'likelihood',
      header: t('donors.likelihoodToDonate'),
      render: (row: Record<string, unknown>) => {
        const pred = likelihoodMap.get((row as unknown as Supporter).supporterId);
        if (!pred) return <span className="text-xs text-warm-gray">--</span>;
        const variant =
          pred.likelihoodCategory === 'High' ? 'success'
          : pred.likelihoodCategory === 'Medium' ? 'info'
          : 'neutral';
        return (
          <Badge variant={variant}>
            {getLikelihoodLabel(pred.likelihoodCategory, t)} ({(pred.likelihoodScore * 100).toFixed(0)}%)
          </Badge>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('donors.supportersTitle')}
        subtitle={t('donors.supportersSubtitle')}
        action={
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus size={16} />
            {t('donors.addSupporter')}
          </Button>
        }
      />

      {/* Filters */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-navy dark:text-white">{t('donors.supporterType')}</label>
            <select
              className={selectClass}
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{t('common.all')}</option>
              {supporterTypes.map((supporterType) => (
                <option key={supporterType} value={supporterType}>{getSupporterTypeLabel(supporterType, t)}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-navy dark:text-white">{t('common.status')}</label>
            <select
              className={selectClass}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{t('safehouses.allStatuses')}</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>{getStatusLabel(s, t)}</option>
              ))}
            </select>
          </div>
          <Input
            label={t('common.search')}
            placeholder={t('donors.searchSupporters')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="mt-4 flex items-end gap-2">
          <div className="flex flex-col gap-1 sm:w-52">
            <label className="text-sm font-medium text-slate-navy dark:text-white">Sort</label>
            <div className="flex gap-1">
              <select
                className={selectClass}
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              >
                <option value="name">{t('common.name')}</option>
                <option value="type">{t('common.type')}</option>
                <option value="status">{t('common.status')}</option>
                <option value="email">{t('common.email')}</option>
                <option value="firstdonation">{t('donors.firstDonation')}</option>
                <option value="channel">{t('donors.channel')}</option>
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
      </Card>

      <Card>
        <Table
          columns={columns}
          data={(data?.items ?? []) as unknown as Record<string, unknown>[]}
          loading={isLoading}
          emptyMessage={t('common.noData')}
          page={page}
          pageSize={pageSize}
          totalPages={data?.totalPages ?? 1}
          totalCount={data?.totalCount}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={getPageSizeOptions(data?.totalCount)}
          onRowClick={(row) =>
            navigate(`/admin/supporters/${(row as unknown as Supporter).supporterId}`)
          }
        />
      </Card>

      {/* Add Supporter Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t('donors.addSupporter')}
        hideFooter
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
  const { t } = useTranslation();
  const supporterSchema = useMemo(() => createSupporterSchema(t), [t]);
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
      <Input label={t('donors.displayName')} error={errors.displayName?.message} {...register('displayName')} />
      <Input label={t('common.email')} type="email" error={errors.email?.message} {...register('email')} />
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-navy dark:text-white">{t('donors.supporterType')}</label>
        <select className={selectClass} {...register('supporterType')}>
          <option value="">Select...</option>
          {supporterTypes.map((supporterType) => (
            <option key={supporterType} value={supporterType}>{getSupporterTypeLabel(supporterType, t)}</option>
          ))}
        </select>
        {errors.supporterType?.message && (
          <p className="text-xs text-red-600">{errors.supporterType.message}</p>
        )}
      </div>
      <Input label={t('donors.organization')} {...register('organizationName')} />
      <Input label="Phone" {...register('phone')} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Region" {...register('region')} />
        <Input label="Country" {...register('country')} />
      </div>
      <Input label={t('donors.channel')} {...register('acquisitionChannel')} />
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" type="button" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {t('donors.addSupporter')}
        </Button>
      </div>
    </form>
  );
}
