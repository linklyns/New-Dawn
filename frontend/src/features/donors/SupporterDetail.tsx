import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
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
      <span className="text-sm text-slate-navy dark:text-white">{value ?? '--'}</span>
    </div>
  );
}

type Tab = 'donations' | 'edit';

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

export function SupporterDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
      navigate('/admin/supporters');
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
        <PageHeader title="Supporter Detail" />
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-red-200 bg-red-50 p-12 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400">
            Failed to load supporter: {(error as Error).message}
          </p>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  const s = supporter!;

  const donationColumns = [
    {
      key: 'donationDate',
      header: 'Date',
      render: (row: Record<string, unknown>) => formatDate(row.donationDate as string),
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
        row.amount != null ? `${row.currencyCode ?? ''} ${Number(row.amount).toLocaleString()}` : '--',
    },
    { key: 'campaignName', header: 'Campaign' },
    { key: 'channelSource', header: 'Channel' },
    {
      key: 'isRecurring',
      header: 'Recurring',
      render: (row: Record<string, unknown>) => (row.isRecurring ? 'Yes' : 'No'),
    },
  ];

  const TABS: { key: Tab; label: string }[] = [
    { key: 'donations', label: 'Donations' },
    { key: 'edit', label: 'Info / Edit' },
  ];

  return (
    <div>
      <PageHeader
        title={s.displayName}
        subtitle={`${s.firstName} ${s.lastName}`}
        action={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('edit')}>
              <Pencil size={16} />
              Edit
            </Button>
            <Button variant="danger" size="sm" onClick={() => setDeleteModalOpen(true)}>
              <Trash2 size={16} />
              Delete
            </Button>
          </div>
        }
      />

      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          Back
        </Button>
      </div>

      {/* Profile Summary */}
      <Card className="mb-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <InfoRow
            label="Type"
            value={<Badge variant={typeVariant(s.supporterType)}>{s.supporterType}</Badge>}
          />
          <InfoRow
            label="Status"
            value={<Badge variant={statusVariant(s.status)}>{s.status}</Badge>}
          />
          <InfoRow label="Email" value={s.email} />
          <InfoRow label="Phone" value={s.phone || '--'} />
          <InfoRow label="Organization" value={s.organizationName || '--'} />
          <InfoRow label="Region" value={s.region || '--'} />
          <InfoRow label="Country" value={s.country || '--'} />
          <InfoRow label="First Donation" value={formatDate(s.firstDonationDate)} />
          <InfoRow label="Acquisition Channel" value={s.acquisitionChannel || '--'} />
          <InfoRow label="Relationship" value={s.relationshipType || '--'} />
          <InfoRow
            label="Likelihood to Donate Again"
            value={
              likelihood ? (
                <Badge
                  variant={
                    likelihood.likelihoodCategory === 'High' ? 'success'
                    : likelihood.likelihoodCategory === 'Medium' ? 'info'
                    : 'neutral'
                  }
                >
                  {likelihood.likelihoodCategory} ({(likelihood.likelihoodScore * 100).toFixed(0)}%)
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
            Donation History
          </h3>
          <Table
            columns={donationColumns}
            data={donations as unknown as Record<string, unknown>[]}
            loading={donationsLoading}
            emptyMessage="No donations found for this supporter."
          />
        </Card>
      )}

      {activeTab === 'edit' && (
        <Card>
          <h3 className="mb-4 font-heading text-base font-semibold text-slate-navy dark:text-white">
            Edit Supporter
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
        title="Delete Supporter"
        confirmText="Delete"
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
        <Input label="Display Name" error={errors.displayName?.message} {...register('displayName')} />
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Input label="Phone" {...register('phone')} />
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
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-navy dark:text-white">Status</label>
          <select className={selectClass} {...register('status')}>
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <Input label="Region" {...register('region')} />
        <Input label="Country" {...register('country')} />
        <Input label="Relationship Type" {...register('relationshipType')} />
        <Input label="First Donation Date" type="date" {...register('firstDonationDate')} />
        <Input label="Acquisition Channel" {...register('acquisitionChannel')} />
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Update Supporter
        </Button>
      </div>
    </form>
  );
}
