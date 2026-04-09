import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, ArrowUpDown, Plus, Pencil, Search, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { smartMatch } from '../../lib/smartSearch';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import type { InterventionPlan } from '../../types/models';
import type { PagedResult } from '../../types/api';

const textareaClass =
  'w-full rounded-lg border border-slate-navy/20 bg-white px-3 py-2 text-sm text-slate-navy placeholder:text-warm-gray/60 focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-slate-navy dark:text-white';
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

const statusOptions = ['Open', 'In Progress', 'Achieved', 'On Hold', 'Closed'] as const;
const filterOptions = ['All', ...statusOptions] as const;

function statusVariant(s: string): 'info' | 'warning' | 'success' | 'neutral' | 'danger' {
  switch (s) {
    case 'Open': return 'info';
    case 'In Progress': return 'warning';
    case 'Achieved': return 'success';
    case 'On Hold': return 'neutral';
    case 'Closed': return 'danger';
    default: return 'neutral';
  }
}

const planSchema = z.object({
  planCategory: z.string().min(1, 'Required'),
  planDescription: z.string().min(1, 'Required'),
  servicesProvided: z.string().optional().default(''),
  targetValue: z.coerce.number().min(0),
  targetDate: z.string().min(1, 'Required'),
  status: z.string().min(1, 'Required'),
  caseConferenceDate: z.string().min(1, 'Required'),
});

type PlanFormData = z.infer<typeof planSchema>;

export function InterventionPlansPage() {
  const { residentId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<InterventionPlan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InterventionPlan | null>(null);
  const [page] = useState(1);
  const [pageSize] = useState(100);

  const { data, isLoading } = useQuery({
    queryKey: ['intervention-plans', residentId, page, pageSize],
    queryFn: () =>
      api.get<PagedResult<InterventionPlan>>(
        `/api/intervention-plans?residentId=${residentId}&page=${page}&pageSize=${pageSize}`,
      ),
  });

  const plans = useMemo(() => {
    const items = data?.items ?? [];
    const filtered = items.filter((p) => {
      if (statusFilter !== 'All' && p.status !== statusFilter) return false;
      return smartMatch(search, [p.planCategory, p.planDescription, p.servicesProvided, p.status, p.targetDate, p.caseConferenceDate]);
    });
    return [...filtered].sort((a, b) => {
      const da = a.targetDate ?? '';
      const db = b.targetDate ?? '';
      return sortDir === 'desc' ? db.localeCompare(da) : da.localeCompare(db);
    });
  }, [data, statusFilter, search, sortDir]);

  const createMutation = useMutation({
    mutationFn: (body: PlanFormData) =>
      api.post('/api/intervention-plans', { ...body, residentId: Number(residentId) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intervention-plans', residentId] });
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (body: PlanFormData & { planId: number }) =>
      api.put(`/api/intervention-plans/${body.planId}`, { ...body, residentId: Number(residentId) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intervention-plans', residentId] });
      setEditingPlan(null);
      setFormOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/intervention-plans/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intervention-plans', residentId] });
      setDeleteTarget(null);
    },
  });

  function openCreate() {
    setEditingPlan(null);
    setFormOpen(true);
  }

  function openEdit(plan: InterventionPlan) {
    setEditingPlan(plan);
    setFormOpen(true);
  }

  function handleFormSubmit(formData: PlanFormData) {
    if (editingPlan) {
      updateMutation.mutate({ ...formData, planId: editingPlan.planId });
    } else {
      createMutation.mutate(formData);
    }
  }

  return (
    <div>
      <PageHeader
        title="Intervention Plans"
        subtitle="Manage intervention plans and services"
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus size={16} />
            Add Plan
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          Back
        </Button>
        <div className="relative min-w-48 flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray" />
          <input
            type="text"
            placeholder="Search plans..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-navy/20 bg-white py-1.5 pl-8 pr-3 text-sm text-slate-navy placeholder:text-warm-gray/60 focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-dark-surface dark:text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-navy/20 bg-white px-3 py-1.5 text-sm text-slate-navy focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-dark-surface dark:text-white"
        >
          {filterOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
          title={`Sort by target date (${sortDir === 'desc' ? 'newest first' : 'oldest first'})`}
        >
          <ArrowUpDown size={14} />
          Date {sortDir === 'desc' ? '↓' : '↑'}
        </Button>
      </div>

      {formOpen && (
        <Card className="mb-6">
          <h3 className="mb-4 font-heading text-base font-semibold text-slate-navy dark:text-white">
            {editingPlan ? 'Edit Plan' : 'New Plan'}
          </h3>
          {(createMutation.isError || updateMutation.isError) && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {((createMutation.error ?? updateMutation.error) as Error).message}
            </div>
          )}
          <PlanForm
            defaultValues={editingPlan ?? undefined}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setFormOpen(false);
              setEditingPlan(null);
            }}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
          />
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : plans.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-warm-gray">
          No intervention plans found.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <Card key={plan.planId}>
              <div className="mb-3 flex items-start justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="info">{plan.planCategory}</Badge>
                  <Badge variant={statusVariant(plan.status)}>{plan.status}</Badge>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(plan)}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(plan)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
              <p className="mb-2 text-sm text-slate-navy dark:text-white">{plan.planDescription}</p>
              {plan.servicesProvided && (
                <p className="mb-2 text-xs text-warm-gray">
                  <span className="font-medium">Services:</span> {plan.servicesProvided}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs text-warm-gray">
                <span>Target: {plan.targetValue}</span>
                <span>Target Date: {formatDate(plan.targetDate)}</span>
                <span>Conference: {formatDate(plan.caseConferenceDate)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete Plan"
        confirmText="Delete"
        confirmVariant="danger"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.planId)}
      >
        <p className="text-sm text-warm-gray">
          Are you sure you want to delete this intervention plan? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

/* ── Inline Form ─────────────────────────────────────────────── */

function PlanForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  defaultValues?: Partial<InterventionPlan>;
  onSubmit: (data: PlanFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PlanFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(planSchema) as any,
    defaultValues: {
      planCategory: defaultValues?.planCategory ?? '',
      planDescription: defaultValues?.planDescription ?? '',
      servicesProvided: defaultValues?.servicesProvided ?? '',
      targetValue: defaultValues?.targetValue ?? 0,
      targetDate: defaultValues?.targetDate?.split('T')[0] ?? '',
      status: defaultValues?.status ?? 'Open',
      caseConferenceDate: defaultValues?.caseConferenceDate?.split('T')[0] ?? '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Input
          label="Plan Category"
          error={errors.planCategory?.message}
          {...register('planCategory')}
        />
        <Input
          label="Target Value"
          type="number"
          error={errors.targetValue?.message}
          {...register('targetValue')}
        />
        <Input
          label="Target Date"
          type="date"
          error={errors.targetDate?.message}
          {...register('targetDate')}
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-navy dark:text-white">Status</label>
          <select className={selectClass} {...register('status')}>
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {errors.status?.message && (
            <p className="text-xs text-red-600">{errors.status.message}</p>
          )}
        </div>
        <Input
          label="Case Conference Date"
          type="date"
          error={errors.caseConferenceDate?.message}
          {...register('caseConferenceDate')}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-navy dark:text-white">Plan Description</label>
        <textarea className={textareaClass} rows={3} {...register('planDescription')} />
        {errors.planDescription?.message && (
          <p className="text-xs text-red-600">{errors.planDescription.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-navy dark:text-white">Services Provided</label>
        <textarea className={textareaClass} rows={2} {...register('servicesProvided')} />
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {defaultValues ? 'Update Plan' : 'Save Plan'}
        </Button>
      </div>
    </form>
  );
}
