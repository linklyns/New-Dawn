import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Plus, Pencil, Trash2, ChevronDown, ChevronUp, Search, ArrowUpDown } from 'lucide-react';
import { api } from '../../lib/api';
import { smartMatch } from '../../lib/smartSearch';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import type { HomeVisitation } from '../../types/models';
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

const visitTypes = ['Routine Follow-Up', 'Post-Placement Monitoring', 'Reintegration Assessment', 'Emergency'] as const;
const cooperationLevels = ['Cooperative', 'Neutral', 'Uncooperative'] as const;
const outcomeOptions = ['Favorable', 'Unfavorable', 'Inconclusive', 'Needs Improvement'] as const;

function outcomeVariant(o: string): 'success' | 'danger' | 'warning' | 'info' {
  switch (o) {
    case 'Favorable': return 'success';
    case 'Unfavorable': return 'danger';
    case 'Inconclusive': return 'warning';
    case 'Needs Improvement': return 'info';
    default: return 'neutral' as 'info';
  }
}

function cooperationVariant(c: string): 'success' | 'neutral' | 'danger' {
  switch (c) {
    case 'Cooperative': return 'success';
    case 'Neutral': return 'neutral';
    case 'Uncooperative': return 'danger';
    default: return 'neutral';
  }
}

const visitSchema = z.object({
  visitDate: z.string().min(1, 'Required'),
  socialWorker: z.string().min(1, 'Required'),
  visitType: z.string().min(1, 'Required'),
  locationVisited: z.string().min(1, 'Required'),
  familyMembersPresent: z.string().optional().default(''),
  purpose: z.string().min(1, 'Required'),
  observations: z.string().min(1, 'Required'),
  familyCooperationLevel: z.string().min(1, 'Required'),
  safetyConcernsNoted: z.boolean().default(false),
  followUpNeeded: z.boolean().default(false),
  followUpNotes: z.string().nullable().optional(),
  visitOutcome: z.string().min(1, 'Required'),
});

type VisitFormData = z.infer<typeof visitSchema>;

export function HomeVisitationsPage() {
  const { residentId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<HomeVisitation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HomeVisitation | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(100);
  const [search, setSearch] = useState('');
  const [visitTypeFilter, setVisitTypeFilter] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading } = useQuery({
    queryKey: ['home-visitations', residentId, page, pageSize],
    queryFn: () =>
      api.get<PagedResult<HomeVisitation>>(
        `/api/home-visitations?residentId=${residentId}&page=${page}&pageSize=${pageSize}`,
      ),
  });

  const visits = useMemo(() => {
    let items = data?.items ?? [];
    if (visitTypeFilter) items = items.filter((v) => v.visitType === visitTypeFilter);
    if (outcomeFilter) items = items.filter((v) => v.visitOutcome === outcomeFilter);
    if (search.trim()) {
      items = items.filter((v) =>
        smartMatch(search, [
          v.visitDate, v.socialWorker, v.visitType, v.locationVisited,
          v.familyMembersPresent, v.purpose, v.observations,
          v.familyCooperationLevel, v.visitOutcome, v.followUpNotes,
        ]),
      );
    }
    return [...items].sort((a, b) => {
      const cmp = a.visitDate.localeCompare(b.visitDate);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, search, visitTypeFilter, outcomeFilter, sortDir]);

  const createMutation = useMutation({
    mutationFn: (body: VisitFormData) =>
      api.post('/api/home-visitations', { ...body, residentId: Number(residentId) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-visitations', residentId] });
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (body: VisitFormData & { visitationId: number }) =>
      api.put(`/api/home-visitations/${body.visitationId}`, { ...body, residentId: Number(residentId) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-visitations', residentId] });
      setEditingVisit(null);
      setFormOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/home-visitations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-visitations', residentId] });
      setDeleteTarget(null);
    },
  });

  function openCreate() {
    setEditingVisit(null);
    setFormOpen(true);
  }

  function openEdit(v: HomeVisitation) {
    setEditingVisit(v);
    setFormOpen(true);
  }

  function handleFormSubmit(formData: VisitFormData) {
    if (editingVisit) {
      updateMutation.mutate({ ...formData, visitationId: editingVisit.visitationId });
    } else {
      createMutation.mutate(formData);
    }
  }

  return (
    <div>
      <PageHeader
        title="Home Visitations"
        subtitle="Track home visit records"
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus size={16} />
            Add Visit
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          Back
        </Button>
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray dark:text-white/40" />
          <input
            className="w-full rounded-lg border border-slate-navy/20 bg-white py-2 pl-9 pr-3 text-sm text-slate-navy placeholder:text-warm-gray/60 focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-dark-surface dark:text-white"
            placeholder="Search any field…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className={selectClass} style={{ maxWidth: 200 }} value={visitTypeFilter} onChange={(e) => setVisitTypeFilter(e.target.value)}>
          <option value="">All visit types</option>
          {visitTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className={selectClass} style={{ maxWidth: 170 }} value={outcomeFilter} onChange={(e) => setOutcomeFilter(e.target.value)}>
          <option value="">All outcomes</option>
          {outcomeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <button
          className={`flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            sortDir === 'desc'
              ? 'border-golden-honey bg-golden-honey/10 text-golden-honey'
              : 'border-slate-navy/20 text-slate-navy dark:border-white/20 dark:text-white'
          }`}
          onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
        >
          <ArrowUpDown size={14} />
          Date {sortDir === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      {formOpen && (
        <Card className="mb-6">
          <h3 className="mb-4 font-heading text-base font-semibold text-slate-navy dark:text-white">
            {editingVisit ? 'Edit Visit' : 'New Visit'}
          </h3>
          {(createMutation.isError || updateMutation.isError) && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {((createMutation.error ?? updateMutation.error) as Error).message}
            </div>
          )}
          <VisitForm
            defaultValues={editingVisit ?? undefined}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setFormOpen(false);
              setEditingVisit(null);
            }}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
          />
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : visits.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-warm-gray">
          No home visitations found.
        </div>
      ) : (
        <div className="space-y-4">
          {visits.map((v) => {
            const isExpanded = expandedId === v.visitationId;
            return (
              <Card key={v.visitationId}>
                <div
                  className="flex cursor-pointer items-center justify-between"
                  onClick={() => setExpandedId(isExpanded ? null : v.visitationId)}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium text-slate-navy dark:text-white">
                      {formatDate(v.visitDate)}
                    </span>
                    <span className="text-sm text-warm-gray">{v.socialWorker}</span>
                    <Badge variant="info">{v.visitType}</Badge>
                    <Badge variant={outcomeVariant(v.visitOutcome)}>{v.visitOutcome}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(v);
                      }}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(v);
                      }}
                    >
                      <Trash2 size={14} />
                    </Button>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 space-y-3 border-t border-slate-navy/10 pt-4 dark:border-white/10">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <span className="text-xs font-medium uppercase tracking-wide text-warm-gray">Location Visited</span>
                        <p className="mt-1 text-sm text-slate-navy dark:text-white">{v.locationVisited}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium uppercase tracking-wide text-warm-gray">Family Members Present</span>
                        <p className="mt-1 text-sm text-slate-navy dark:text-white">{v.familyMembersPresent || '--'}</p>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wide text-warm-gray">Purpose</span>
                      <p className="mt-1 text-sm text-slate-navy dark:text-white">{v.purpose}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wide text-warm-gray">Observations</span>
                      <p className="mt-1 text-sm text-slate-navy dark:text-white">{v.observations}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Badge variant={cooperationVariant(v.familyCooperationLevel)}>
                        {v.familyCooperationLevel}
                      </Badge>
                      {v.safetyConcernsNoted && <Badge variant="danger">Safety Concerns</Badge>}
                      {v.followUpNeeded && <Badge variant="warning">Follow-Up Needed</Badge>}
                    </div>
                    {v.followUpNotes && (
                      <div>
                        <span className="text-xs font-medium uppercase tracking-wide text-warm-gray">Follow-Up Notes</span>
                        <p className="mt-1 text-sm text-slate-navy dark:text-white">{v.followUpNotes}</p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete Visit"
        confirmText="Delete"
        confirmVariant="danger"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.visitationId)}
      >
        <p className="text-sm text-warm-gray">
          Are you sure you want to delete this visit from{' '}
          {deleteTarget ? formatDate(deleteTarget.visitDate) : ''}? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

/* ── Inline Form ─────────────────────────────────────────────── */

function VisitForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  defaultValues?: Partial<HomeVisitation>;
  onSubmit: (data: VisitFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<VisitFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(visitSchema) as any,
    defaultValues: {
      visitDate: defaultValues?.visitDate?.split('T')[0] ?? '',
      socialWorker: defaultValues?.socialWorker ?? '',
      visitType: defaultValues?.visitType ?? '',
      locationVisited: defaultValues?.locationVisited ?? '',
      familyMembersPresent: defaultValues?.familyMembersPresent ?? '',
      purpose: defaultValues?.purpose ?? '',
      observations: defaultValues?.observations ?? '',
      familyCooperationLevel: defaultValues?.familyCooperationLevel ?? '',
      safetyConcernsNoted: defaultValues?.safetyConcernsNoted ?? false,
      followUpNeeded: defaultValues?.followUpNeeded ?? false,
      followUpNotes: defaultValues?.followUpNotes ?? '',
      visitOutcome: defaultValues?.visitOutcome ?? '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Input
          label="Visit Date"
          type="date"
          error={errors.visitDate?.message}
          {...register('visitDate')}
        />
        <Input
          label="Social Worker"
          error={errors.socialWorker?.message}
          {...register('socialWorker')}
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-navy dark:text-white">Visit Type</label>
          <select className={selectClass} {...register('visitType')}>
            <option value="">Select...</option>
            {visitTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {errors.visitType?.message && (
            <p className="text-xs text-red-600">{errors.visitType.message}</p>
          )}
        </div>
        <Input
          label="Location Visited"
          error={errors.locationVisited?.message}
          {...register('locationVisited')}
        />
        <Input
          label="Family Members Present"
          {...register('familyMembersPresent')}
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-navy dark:text-white">Cooperation Level</label>
          <select className={selectClass} {...register('familyCooperationLevel')}>
            <option value="">Select...</option>
            {cooperationLevels.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          {errors.familyCooperationLevel?.message && (
            <p className="text-xs text-red-600">{errors.familyCooperationLevel.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-navy dark:text-white">Purpose</label>
          <textarea className={textareaClass} rows={3} {...register('purpose')} />
          {errors.purpose?.message && (
            <p className="text-xs text-red-600">{errors.purpose.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-navy dark:text-white">Observations</label>
          <textarea className={textareaClass} rows={3} {...register('observations')} />
          {errors.observations?.message && (
            <p className="text-xs text-red-600">{errors.observations.message}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm text-slate-navy dark:text-white">
          <input
            type="checkbox"
            className={checkboxClass}
            checked={watch('safetyConcernsNoted')}
            onChange={(e) => setValue('safetyConcernsNoted', e.target.checked)}
          />
          Safety Concerns Noted
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-navy dark:text-white">
          <input
            type="checkbox"
            className={checkboxClass}
            checked={watch('followUpNeeded')}
            onChange={(e) => setValue('followUpNeeded', e.target.checked)}
          />
          Follow-Up Needed
        </label>
      </div>

      {watch('followUpNeeded') && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-navy dark:text-white">Follow-Up Notes</label>
          <textarea className={textareaClass} rows={2} {...register('followUpNotes')} />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-navy dark:text-white">Visit Outcome</label>
        <select className={selectClass} {...register('visitOutcome')}>
          <option value="">Select...</option>
          {outcomeOptions.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        {errors.visitOutcome?.message && (
          <p className="text-xs text-red-600">{errors.visitOutcome.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {defaultValues ? 'Update Visit' : 'Save Visit'}
        </Button>
      </div>
    </form>
  );
}
