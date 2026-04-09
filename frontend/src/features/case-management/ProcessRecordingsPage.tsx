import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Plus, Pencil, Trash2, ChevronDown, ChevronUp, Search, ArrowUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { smartMatch } from '../../lib/smartSearch';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { scrollPageToTop } from '../../lib/scroll';
import type { ProcessRecording } from '../../types/models';
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

const sessionTypes = ['Individual', 'Group', 'Family'] as const;
const emotionalStates = ['Angry', 'Distressed', 'Anxious', 'Hopeful', 'Happy', 'Sad', 'Calm', 'Neutral'] as const;

const recordingSchema = z.object({
  sessionDate: z.string().min(1, 'Required'),
  socialWorker: z.string().min(1, 'Required'),
  sessionType: z.string().min(1, 'Required'),
  sessionDurationMinutes: z.coerce.number().min(1, 'Must be at least 1'),
  emotionalStateObserved: z.string().min(1, 'Required'),
  emotionalStateEnd: z.string().min(1, 'Required'),
  sessionNarrative: z.string().min(1, 'Required'),
  interventionsApplied: z.string().optional().default(''),
  followUpActions: z.string().optional().default(''),
  progressNoted: z.boolean().default(false),
  concernsFlagged: z.boolean().default(false),
  referralMade: z.boolean().default(false),
  notesRestricted: z.string().nullable().optional(),
});

type RecordingFormData = z.infer<typeof recordingSchema>;

function sessionTypeBadge(t: string): 'info' | 'warning' | 'success' {
  switch (t) {
    case 'Individual': return 'info';
    case 'Group': return 'warning';
    case 'Family': return 'success';
    default: return 'info';
  }
}

function translateSessionType(t: (key: string) => string, value: string): string {
  switch (value) {
    case 'Individual': return t('caseManagement.individual');
    case 'Group': return t('caseManagement.group');
    case 'Family': return t('caseManagement.family');
    default: return value;
  }
}

export function ProcessRecordingsPage() {
  const { residentId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ProcessRecording | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProcessRecording | null>(null);
  const [page] = useState(1);
  const [pageSize] = useState(100);
  const [search, setSearch] = useState('');
  const [sessionTypeFilter, setSessionTypeFilter] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading } = useQuery({
    queryKey: ['process-recordings', residentId, page, pageSize],
    queryFn: () =>
      api.get<PagedResult<ProcessRecording>>(
        `/api/process-recordings?residentId=${residentId}&page=${page}&pageSize=${pageSize}`,
      ),
  });

  const recordings = useMemo(() => {
    let items = data?.items ?? [];
    if (sessionTypeFilter) items = items.filter((r) => r.sessionType === sessionTypeFilter);
    if (search.trim()) {
      items = items.filter((r) =>
        smartMatch(search, [
          r.sessionDate, r.socialWorker, r.sessionType,
          r.emotionalStateObserved, r.emotionalStateEnd,
          r.sessionNarrative, r.interventionsApplied, r.followUpActions,
        ]),
      );
    }
    return [...items].sort((a, b) => {
      const cmp = a.sessionDate.localeCompare(b.sessionDate);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, search, sessionTypeFilter, sortDir]);

  const createMutation = useMutation({
    mutationFn: (body: RecordingFormData) =>
      api.post('/api/process-recordings', { ...body, residentId: Number(residentId) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['process-recordings', residentId] });
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (body: RecordingFormData & { recordingId: number }) =>
      api.put(`/api/process-recordings/${body.recordingId}`, { ...body, residentId: Number(residentId) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['process-recordings', residentId] });
      setEditingRecord(null);
      setFormOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/process-recordings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['process-recordings', residentId] });
      setDeleteTarget(null);
    },
  });

  function openCreate() {
    setEditingRecord(null);
    setFormOpen(true);
    scrollPageToTop();
  }

  function openEdit(rec: ProcessRecording) {
    setEditingRecord(rec);
    setFormOpen(true);
    scrollPageToTop();
  }

  function handleFormSubmit(formData: RecordingFormData) {
    if (editingRecord) {
      updateMutation.mutate({ ...formData, recordingId: editingRecord.recordingId });
    } else {
      createMutation.mutate(formData);
    }
  }

  return (
    <div>
      <PageHeader
        title={t('caseManagement.processRecordings')}
        subtitle={t('caseManagement.sessionNarrative')}
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus size={16} />
            {t('caseManagement.addRecording')}
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          {t('common.back')}
        </Button>
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray dark:text-white/40" />
          <input
            className="w-full rounded-lg border border-slate-navy/20 bg-white py-2 pl-9 pr-3 text-sm text-slate-navy placeholder:text-warm-gray/60 focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-dark-surface dark:text-white"
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={selectClass}
          style={{ maxWidth: 180 }}
          value={sessionTypeFilter}
          onChange={(e) => setSessionTypeFilter(e.target.value)}
        >
          <option value="">{t('common.all')} {t('caseManagement.sessionType').toLowerCase()}</option>
          {sessionTypes.map((sessionType) => <option key={sessionType} value={sessionType}>{translateSessionType(t, sessionType)}</option>)}
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
          {t('common.date')} {sortDir === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      {formOpen && (
        <Card className="mb-6">
          <h3 className="mb-4 font-heading text-base font-semibold text-slate-navy dark:text-white">
            {editingRecord ? `${t('common.edit')} ${t('caseManagement.processRecordings')}` : t('caseManagement.newRecord')}
          </h3>
          {(createMutation.isError || updateMutation.isError) && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {((createMutation.error ?? updateMutation.error) as Error).message}
            </div>
          )}
          <RecordingForm
            defaultValues={editingRecord ?? undefined}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setFormOpen(false);
              setEditingRecord(null);
            }}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
          />
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : recordings.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-warm-gray">
          {t('common.noData')}
        </div>
      ) : (
        <div className="space-y-4">
          {recordings.map((rec) => {
            const isExpanded = expandedId === rec.recordingId;
            return (
              <Card key={rec.recordingId}>
                <div
                  className="flex cursor-pointer items-center justify-between"
                  onClick={() => setExpandedId(isExpanded ? null : rec.recordingId)}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium text-slate-navy dark:text-white">
                      {formatDate(rec.sessionDate)}
                    </span>
                    <span className="text-sm text-warm-gray">{rec.socialWorker}</span>
                    <Badge variant={sessionTypeBadge(rec.sessionType)}>{translateSessionType(t, rec.sessionType)}</Badge>
                    <span className="text-xs text-warm-gray">{rec.sessionDurationMinutes} min</span>
                    <span className="text-xs text-warm-gray">
                      {rec.emotionalStateObserved} &rarr; {rec.emotionalStateEnd}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(rec);
                      }}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(rec);
                      }}
                    >
                      <Trash2 size={14} />
                    </Button>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 space-y-3 border-t border-slate-navy/10 pt-4 dark:border-white/10">
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wide text-warm-gray">
                        {t('caseManagement.sessionNarrative')}
                      </span>
                      <p className="mt-1 text-sm text-slate-navy dark:text-white">
                        {rec.sessionNarrative}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <span className="text-xs font-medium uppercase tracking-wide text-warm-gray">
                          {t('caseManagement.interventionsApplied')}
                        </span>
                        <p className="mt-1 text-sm text-slate-navy dark:text-white">
                          {rec.interventionsApplied || '--'}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs font-medium uppercase tracking-wide text-warm-gray">
                          {t('caseManagement.followUpActions')}
                        </span>
                        <p className="mt-1 text-sm text-slate-navy dark:text-white">
                          {rec.followUpActions || '--'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {rec.progressNoted && <Badge variant="success">{t('caseManagement.progressNoted')}</Badge>}
                      {rec.concernsFlagged && <Badge variant="danger">{t('caseManagement.concernsFlagged')}</Badge>}
                      {rec.referralMade && <Badge variant="info">{t('caseManagement.referralMade')}</Badge>}
                    </div>
                    {rec.notesRestricted && (
                      <div>
                        <span className="text-xs font-medium uppercase tracking-wide text-warm-gray">
                          {t('residents.restrictedNotes')}
                        </span>
                        <p className="mt-1 text-sm text-slate-navy dark:text-white">
                          {rec.notesRestricted}
                        </p>
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
        title={`${t('common.delete')} ${t('caseManagement.processRecordings')}`}
        confirmText={t('common.delete')}
        confirmVariant="danger"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.recordingId)}
      >
        <p className="text-sm text-warm-gray">
          {t('common.delete')} {t('caseManagement.processRecordings').toLowerCase()} {t('common.date').toLowerCase()}{' '}
          {deleteTarget ? formatDate(deleteTarget.sessionDate) : ''}? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

/* ── Inline Form ─────────────────────────────────────────────── */

function RecordingForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  defaultValues?: Partial<ProcessRecording>;
  onSubmit: (data: RecordingFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RecordingFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(recordingSchema) as any,
    defaultValues: {
      sessionDate: defaultValues?.sessionDate?.split('T')[0] ?? '',
      socialWorker: defaultValues?.socialWorker ?? '',
      sessionType: defaultValues?.sessionType ?? '',
      sessionDurationMinutes: defaultValues?.sessionDurationMinutes ?? 30,
      emotionalStateObserved: defaultValues?.emotionalStateObserved ?? '',
      emotionalStateEnd: defaultValues?.emotionalStateEnd ?? '',
      sessionNarrative: defaultValues?.sessionNarrative ?? '',
      interventionsApplied: defaultValues?.interventionsApplied ?? '',
      followUpActions: defaultValues?.followUpActions ?? '',
      progressNoted: defaultValues?.progressNoted ?? false,
      concernsFlagged: defaultValues?.concernsFlagged ?? false,
      referralMade: defaultValues?.referralMade ?? false,
      notesRestricted: defaultValues?.notesRestricted ?? '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Input
          label={t('caseManagement.sessionDate')}
          type="date"
          error={errors.sessionDate?.message}
          {...register('sessionDate')}
        />
        <Input
          label={t('caseManagement.socialWorker')}
          error={errors.socialWorker?.message}
          {...register('socialWorker')}
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-navy dark:text-white">{t('caseManagement.sessionType')}</label>
          <select className={selectClass} {...register('sessionType')}>
            <option value="">{t('common.select', { defaultValue: 'Select...' })}</option>
            {sessionTypes.map((sessionType) => (
              <option key={sessionType} value={sessionType}>{translateSessionType(t, sessionType)}</option>
            ))}
          </select>
          {errors.sessionType?.message && (
            <p className="text-xs text-red-600">{errors.sessionType.message}</p>
          )}
        </div>
        <Input
          label={t('caseManagement.sessionDuration')}
          type="number"
          step="any"
          error={errors.sessionDurationMinutes?.message}
          {...register('sessionDurationMinutes')}
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-navy dark:text-white">{t('caseManagement.emotionalStateObserved')}</label>
          <select className={selectClass} {...register('emotionalStateObserved')}>
            <option value="">{t('common.select', { defaultValue: 'Select...' })}</option>
            {emotionalStates.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {errors.emotionalStateObserved?.message && (
            <p className="text-xs text-red-600">{errors.emotionalStateObserved.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-navy dark:text-white">{t('caseManagement.emotionalStateEnd')}</label>
          <select className={selectClass} {...register('emotionalStateEnd')}>
            <option value="">{t('common.select', { defaultValue: 'Select...' })}</option>
            {emotionalStates.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {errors.emotionalStateEnd?.message && (
            <p className="text-xs text-red-600">{errors.emotionalStateEnd.message}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-navy dark:text-white">{t('caseManagement.sessionNarrative')}</label>
        <textarea className={textareaClass} rows={4} {...register('sessionNarrative')} />
        {errors.sessionNarrative?.message && (
          <p className="text-xs text-red-600">{errors.sessionNarrative.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-navy dark:text-white">{t('caseManagement.interventionsApplied')}</label>
          <textarea className={textareaClass} rows={2} {...register('interventionsApplied')} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-navy dark:text-white">{t('caseManagement.followUpActions')}</label>
          <textarea className={textareaClass} rows={2} {...register('followUpActions')} />
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm text-slate-navy dark:text-white">
          <input
            type="checkbox"
            className={checkboxClass}
            checked={watch('progressNoted')}
            onChange={(e) => setValue('progressNoted', e.target.checked)}
          />
          {t('caseManagement.progressNoted')}
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-navy dark:text-white">
          <input
            type="checkbox"
            className={checkboxClass}
            checked={watch('concernsFlagged')}
            onChange={(e) => setValue('concernsFlagged', e.target.checked)}
          />
          {t('caseManagement.concernsFlagged')}
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-navy dark:text-white">
          <input
            type="checkbox"
            className={checkboxClass}
            checked={watch('referralMade')}
            onChange={(e) => setValue('referralMade', e.target.checked)}
          />
          {t('caseManagement.referralMade')}
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-navy dark:text-white">{t('residents.restrictedNotes')}</label>
        <textarea className={textareaClass} rows={2} {...register('notesRestricted')} />
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" type="button" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {defaultValues ? `${t('common.edit')} ${t('caseManagement.processRecordings')}` : `${t('common.save')} ${t('caseManagement.processRecordings')}`}
        </Button>
      </div>
    </form>
  );
}
