import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import {
  formatLocalizedCurrency,
  formatLocalizedDate,
  formatLocalizedPercent,
  resolvePreferredCurrency,
  resolveUserPreferences,
} from '../../lib/locale';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import type { Supporter, Donation } from '../../types/models';
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

function getDonationTypeLabel(type: string, t: (key: string) => string): string {
  switch (type) {
    case 'Monetary': return t('donors.monetary');
    case 'InKind': return t('donors.inKind');
    case 'Time': return t('donors.time');
    case 'Skills': return t('donors.skills');
    case 'SocialMedia': return t('donors.socialMedia');
    default: return type;
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

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wide text-warm-gray">{label}</span>
      <span className="break-words text-sm text-slate-navy dark:text-white">{value ?? '--'}</span>
    </div>
  );
}

type Tab = 'donations' | 'edit';

type SupporterFormData = z.infer<ReturnType<typeof createSupporterSchema>>;

export function SupporterDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const preferences = resolveUserPreferences(currentUser);

  const [activeTab, setActiveTab] = useState<Tab>('donations');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const { data: supporter, isLoading, isError, error } = useQuery({
    queryKey: ['supporter', id],
    queryFn: () => api.get<Supporter>(`/api/supporters/${id}`),
  });

  const { data: donationsData, isLoading: donationsLoading } = useQuery({
    queryKey: ['donations', 'supporter', id],
    queryFn: () =>
      api.get<PagedResult<Donation>>(`/api/donations?supporterId=${id}&page=1&pageSize=50`),
  });

  const donations = donationsData?.items ?? [];

  const { data: likelihoodResp } = useQuery({
    queryKey: ['supporter-likelihood'],
    queryFn: () => api.get<{ items: SupporterLikelihood[] }>('/api/predictions/ml/supporter-likelihood'),
    staleTime: 5 * 60 * 1000,
  });

  const likelihood = (likelihoodResp?.items ?? []).find(
    (l) => l.supporterId === Number(id),
  );

  const updateMutation = useMutation({
    mutationFn: (data: SupporterFormData) => api.put(`/api/supporters/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supporter', id] });
      queryClient.invalidateQueries({ queryKey: ['supporters'] });
      setActiveTab('donations');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/supporters/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supporters'] });
      navigate(currentUser?.role === 'Donor' ? '/app/supporters' : '/admin/supporters');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <PageHeader title={t('donors.supporterDetail')} />
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-red-200 bg-red-50 p-12 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400">
            Failed to load supporter: {(error as Error).message}
          </p>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            {t('common.back')}
          </Button>
        </div>
      </div>
    );
  }

  const s = supporter!;

  const donationColumns = [
    {
      key: 'donationDate',
      header: t('common.date'),
      render: (row: Record<string, unknown>) => formatDate(row.donationDate as string),
    },
    {
      key: 'donationType',
      header: t('common.type'),
      render: (row: Record<string, unknown>) => (
        <Badge variant={donationTypeVariant(row.donationType as string)}>
          {getDonationTypeLabel(row.donationType as string, t)}
        </Badge>
      ),
    },
    {
      key: 'amount',
      header: t('donors.amount'),
      render: (row: Record<string, unknown>) => {
        if (row.amount == null) {
          return '--';
        }

        const currencyCode = typeof row.currencyCode === 'string' && row.currencyCode.trim().length > 0
          ? resolvePreferredCurrency(row.currencyCode)
          : null;

        return currencyCode
          ? formatLocalizedCurrency(Number(row.amount), preferences, {
            currency: currencyCode,
            sourceCurrency: currencyCode,
          })
          : formatLocalizedCurrency(Number(row.amount), preferences, {
            currency: preferences.preferredCurrency,
          });
      },
    },
    { key: 'campaignName', header: t('donors.campaign') },
    { key: 'channelSource', header: t('donors.channel') },
    {
      key: 'isRecurring',
      header: t('donors.recurring'),
      render: (row: Record<string, unknown>) => (row.isRecurring ? t('common.yes') : t('common.no')),
    },
  ];

  const TABS: { key: Tab; label: string }[] = [
    { key: 'donations', label: t('donors.donationsTab') },
    { key: 'edit', label: t('donors.infoEditTab') },
  ];

  return (
    <div>
      <PageHeader
        title={s.displayName}
        subtitle={`${s.firstName} ${s.lastName}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('edit')}>
              <Pencil size={16} />
              {t('common.edit')}
            </Button>
            <Button variant="danger" size="sm" onClick={() => setDeleteModalOpen(true)}>
              <Trash2 size={16} />
              {t('common.delete')}
            </Button>
          </div>
        }
      />

      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          {t('common.back')}
        </Button>
      </div>

      {/* Profile Summary */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoRow
            label={t('common.type')}
            value={<Badge variant={typeVariant(s.supporterType)}>{getSupporterTypeLabel(s.supporterType, t)}</Badge>}
          />
          <InfoRow
            label={t('common.status')}
            value={<Badge variant={statusVariant(s.status)}>{getStatusLabel(s.status, t)}</Badge>}
          />
          <InfoRow label={t('common.email')} value={s.email} />
          <InfoRow label="Phone" value={s.phone || '--'} />
          <InfoRow label={t('donors.organization')} value={s.organizationName || '--'} />
          <InfoRow label={t('safehouses.region')} value={s.region || '--'} />
          <InfoRow label="Country" value={s.country || '--'} />
          <InfoRow label={t('donors.firstDonation')} value={formatDate(s.firstDonationDate)} />
          <InfoRow label={t('donors.channel')} value={s.acquisitionChannel || '--'} />
          <InfoRow label="Relationship" value={s.relationshipType || '--'} />
          <InfoRow
            label={t('donors.likelihoodToDonate')}
            value={
              likelihood ? (
                <Badge
                  variant={
                    likelihood.likelihoodCategory === 'High' ? 'success'
                    : likelihood.likelihoodCategory === 'Medium' ? 'info'
                    : 'neutral'
                  }
                >
                  {likelihood.likelihoodCategory} ({formatLocalizedPercent(likelihood.likelihoodScore * 100, preferences)})
                </Badge>
              ) : '--'
            }
          />
          {likelihood?.topReason1 && (
            <InfoRow
              label="Top Prediction Drivers"
              value={[likelihood.topReason1, likelihood.topReason2].filter(Boolean).join(', ')}
            />
          )}
        </div>
      </Card>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-navy/10 dark:border-white/10">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-golden-honey text-slate-navy dark:text-white'
                : 'text-warm-gray hover:text-slate-navy dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'donations' && (
        <Card>
          <h3 className="mb-4 font-heading text-base font-semibold text-slate-navy dark:text-white">
            {t('donors.donationHistory')}
          </h3>
          <Table
            columns={donationColumns}
            data={donations as unknown as Record<string, unknown>[]}
            loading={donationsLoading}
            emptyMessage={t('common.noData')}
          />
        </Card>
      )}

      {activeTab === 'edit' && (
        <Card>
          <h3 className="mb-4 font-heading text-base font-semibold text-slate-navy dark:text-white">
            {t('donors.supporterInfo')}
          </h3>
          {updateMutation.isError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {(updateMutation.error as Error).message}
            </div>
          )}
          <EditSupporterForm
            defaultValues={s}
            onSubmit={(formData) => updateMutation.mutate(formData)}
            onCancel={() => setActiveTab('donations')}
            isSubmitting={updateMutation.isPending}
          />
        </Card>
      )}

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title={`${t('common.delete')} ${t('donors.supporter')}`}
        confirmText={t('common.delete')}
        confirmVariant="danger"
        onConfirm={() => deleteMutation.mutate()}
      >
        <p className="text-sm text-warm-gray">
          Are you sure you want to delete {s.displayName}? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

/* ── Edit Form ───────────────────────────────────────────────── */

function EditSupporterForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  defaultValues: Supporter;
  onSubmit: (data: SupporterFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
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
      supporterType: defaultValues.supporterType ?? '',
      displayName: defaultValues.displayName ?? '',
      organizationName: defaultValues.organizationName ?? '',
      firstName: defaultValues.firstName ?? '',
      lastName: defaultValues.lastName ?? '',
      relationshipType: defaultValues.relationshipType ?? '',
      region: defaultValues.region ?? '',
      country: defaultValues.country ?? '',
      email: defaultValues.email ?? '',
      phone: defaultValues.phone ?? '',
      status: defaultValues.status ?? 'Active',
      firstDonationDate: defaultValues.firstDonationDate?.split('T')[0] ?? '',
      acquisitionChannel: defaultValues.acquisitionChannel ?? '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Input label="First Name" error={errors.firstName?.message} {...register('firstName')} />
        <Input label="Last Name" error={errors.lastName?.message} {...register('lastName')} />
        <Input label={t('donors.displayName')} error={errors.displayName?.message} {...register('displayName')} />
        <Input label={t('common.email')} type="email" error={errors.email?.message} {...register('email')} />
        <Input label="Phone" {...register('phone')} />
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
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-navy dark:text-white">{t('common.status')}</label>
          <select className={selectClass} {...register('status')}>
            {statusOptions.map((s) => (
              <option key={s} value={s}>{getStatusLabel(s, t)}</option>
            ))}
          </select>
        </div>
        <Input label={t('safehouses.region')} {...register('region')} />
        <Input label="Country" {...register('country')} />
        <Input label="Relationship Type" {...register('relationshipType')} />
        <Input label={t('donors.firstDonation')} type="date" {...register('firstDonationDate')} />
        <Input label={t('donors.channel')} {...register('acquisitionChannel')} />
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" type="button" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
