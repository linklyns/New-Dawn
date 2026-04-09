import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Plus, Pencil, Trash2, Search, ArrowUpDown } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { smartMatch } from '../../lib/smartSearch';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { scrollPageToTop } from '../../lib/scroll';
import type { EducationRecord } from '../../types/models';
import type { PagedResult } from '../../types/api';

const selectClass =
  'w-full rounded-lg border border-slate-navy/20 bg-white px-3 py-2 text-sm text-slate-navy focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-slate-navy dark:text-white';
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

const educationLevels = ['Primary', 'Secondary', 'Vocational'] as const;
const completionStatuses = ['NotStarted', 'InProgress', 'Completed'] as const;

function completionVariant(s: string): 'neutral' | 'warning' | 'success' {
  switch (s) {
    case 'NotStarted': return 'neutral';
    case 'InProgress': return 'warning';
    case 'Completed': return 'success';
    default: return 'neutral';
  }
}

function translateCompletionStatus(t: (key: string) => string, value: string): string {
  switch (value) {
    case 'NotStarted': return t('caseManagement.notStarted');
    case 'InProgress': return t('caseManagement.inProgress');
    case 'Completed': return t('caseManagement.completed');
    default: return value;
  }
}

const educationSchema = z.object({
  recordDate: z.string().min(1, 'Required'),
  educationLevel: z.string().min(1, 'Required'),
  schoolName: z.string().min(1, 'Required'),
  enrollmentStatus: z.string().min(1, 'Required'),
  attendanceRate: z.coerce.number().min(0).max(100),
  progressPercent: z.coerce.number().min(0).max(100),
  completionStatus: z.string().min(1, 'Required'),
  notes: z.string().optional().default(''),
});

type EducationFormData = z.infer<typeof educationSchema>;

export function EducationRecordsPage() {
  const { residentId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EducationRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EducationRecord | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(100);
  const [search, setSearch] = useState('');
  const [completionFilter, setCompletionFilter] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading } = useQuery({
    queryKey: ['education-records', residentId, page, pageSize],
    queryFn: () =>
      api.get<PagedResult<EducationRecord>>(
        `/api/education-records?residentId=${residentId}&page=${page}&pageSize=${pageSize}`,
      ),
  });

  const records = useMemo(() => {
    let items = data?.items ?? [];
    if (completionFilter) items = items.filter((r) => r.completionStatus === completionFilter);
    if (search.trim()) {
      items = items.filter((r) =>
        smartMatch(search, [
          r.recordDate, r.educationLevel, r.schoolName,
          r.enrollmentStatus, r.completionStatus, r.attendanceRate,
          r.progressPercent, r.notes,
        ]),
      );
    }
    return [...items].sort((a, b) => {
      const cmp = a.recordDate.localeCompare(b.recordDate);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, search, completionFilter, sortDir]);

  const createMutation = useMutation({
    mutationFn: (body: EducationFormData) =>
      api.post('/api/education-records', { ...body, residentId: Number(residentId) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education-records', residentId] });
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (body: EducationFormData & { educationRecordId: number }) =>
      api.put(`/api/education-records/${body.educationRecordId}`, { ...body, residentId: Number(residentId) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education-records', residentId] });
      setEditingRecord(null);
      setFormOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/education-records/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education-records', residentId] });
      setDeleteTarget(null);
    },
  });

  function openCreate() {
    setEditingRecord(null);
    setFormOpen(true);
    scrollPageToTop();
  }

  function openEdit(rec: EducationRecord) {
    setEditingRecord(rec);
    setFormOpen(true);
    scrollPageToTop();
  }

  function handleFormSubmit(formData: EducationFormData) {
    if (editingRecord) {
      updateMutation.mutate({ ...formData, educationRecordId: editingRecord.educationRecordId });
    } else {
      createMutation.mutate(formData);
    }
  }

  const chartData = [...records]
    .sort((a, b) => a.recordDate.localeCompare(b.recordDate))
    .map((r) => ({
      date: formatDate(r.recordDate),
      progressPercent: r.progressPercent,
    }));

  const columns = [
    {
      key: 'recordDate',
      header: t('common.date'),
      render: (row: Record<string, unknown>) => formatDate(row.recordDate as string),
    },
    { key: 'educationLevel', header: t('caseManagement.educationLevel') },
    { key: 'schoolName', header: t('caseManagement.schoolName') },
    {
      key: 'attendanceRate',
      header: t('caseManagement.attendancePercent'),
      render: (row: Record<string, unknown>) => `${row.attendanceRate}%`,
    },
    {
      key: 'progressPercent',
      header: t('caseManagement.progressPercent'),
      render: (row: Record<string, unknown>) => `${row.progressPercent}%`,
    },
    {
      key: 'completionStatus',
      header: t('common.status'),
      render: (row: Record<string, unknown>) => (
        <Badge variant={completionVariant(row.completionStatus as string)}>
          {translateCompletionStatus(t, row.completionStatus as string)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row: Record<string, unknown>) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(row as unknown as EducationRecord)}>
            <Pencil size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(row as unknown as EducationRecord)}>
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('caseManagement.educationRecords')}
        subtitle={t('caseManagement.progressPercent')}
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus size={16} />
            {t('caseManagement.addRecord')}
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
        <select className={selectClass} style={{ maxWidth: 180 }} value={completionFilter} onChange={(e) => setCompletionFilter(e.target.value)}>
          <option value="">{t('common.all')} {t('common.status').toLowerCase()}</option>
          {completionStatuses.map((status) => <option key={status} value={status}>{translateCompletionStatus(t, status)}</option>)}
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
            {editingRecord ? `${t('common.edit')} ${t('caseManagement.educationRecords')}` : t('caseManagement.newRecord')}
          </h3>
          {(createMutation.isError || updateMutation.isError) && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {((createMutation.error ?? updateMutation.error) as Error).message}
            </div>
          )}
          <EducationForm
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

      {/* Progress Chart */}
      {chartData.length > 1 && (
        <Card className="mb-6">
          <h3 className="mb-4 font-heading text-base font-semibold text-slate-navy dark:text-white">
            {t('caseManagement.progressPercent')}
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="progressPercent"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={{ r: 4 }}
                name={t('caseManagement.progressPercent')}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card>
        <Table
          columns={columns}
          data={records as unknown as Record<string, unknown>[]}
          loading={isLoading}
          emptyMessage={t('common.noData')}
          page={page}
          totalPages={data?.totalPages ?? 1}
          onPageChange={setPage}
        />
      </Card>

      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={`${t('common.delete')} ${t('caseManagement.educationRecords')}`}
        confirmText={t('common.delete')}
        confirmVariant="danger"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.educationRecordId)}
      >
        <p className="text-sm text-warm-gray">
          {t('common.delete')} {t('caseManagement.educationRecords').toLowerCase()}? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

/* ── Inline Form ─────────────────────────────────────────────── */

function EducationForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  defaultValues?: Partial<EducationRecord>;
  onSubmit: (data: EducationFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EducationFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(educationSchema) as any,
    defaultValues: {
      recordDate: defaultValues?.recordDate?.split('T')[0] ?? '',
      educationLevel: defaultValues?.educationLevel ?? '',
      schoolName: defaultValues?.schoolName ?? '',
      enrollmentStatus: defaultValues?.enrollmentStatus ?? '',
      attendanceRate: defaultValues?.attendanceRate ?? 0,
      progressPercent: defaultValues?.progressPercent ?? 0,
      completionStatus: defaultValues?.completionStatus ?? '',
      notes: defaultValues?.notes ?? '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Input
          label={t('caseManagement.recordDate')}
          type="date"
          error={errors.recordDate?.message}
          {...register('recordDate')}
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-navy dark:text-white">{t('caseManagement.educationLevel')}</label>
          <select className={selectClass} {...register('educationLevel')}>
            <option value="">{t('common.select', { defaultValue: 'Select...' })}</option>
            {educationLevels.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          {errors.educationLevel?.message && (
            <p className="text-xs text-red-600">{errors.educationLevel.message}</p>
          )}
        </div>
        <Input
          label={t('caseManagement.schoolName')}
          error={errors.schoolName?.message}
          {...register('schoolName')}
        />
        <Input
          label={t('caseManagement.enrollmentStatus')}
          error={errors.enrollmentStatus?.message}
          {...register('enrollmentStatus')}
        />
        <Input
          label={t('caseManagement.attendancePercent')}
          type="number"
          step="any"
          error={errors.attendanceRate?.message}
          {...register('attendanceRate')}
        />
        <Input
          label={t('caseManagement.progressPercent')}
          type="number"
          step="any"
          error={errors.progressPercent?.message}
          {...register('progressPercent')}
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-navy dark:text-white">{t('caseManagement.completionStatus')}</label>
          <select className={selectClass} {...register('completionStatus')}>
            <option value="">{t('common.select', { defaultValue: 'Select...' })}</option>
            {completionStatuses.map((status) => (
              <option key={status} value={status}>{translateCompletionStatus(t, status)}</option>
            ))}
          </select>
          {errors.completionStatus?.message && (
            <p className="text-xs text-red-600">{errors.completionStatus.message}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-navy dark:text-white">{t('common.notes')}</label>
        <textarea className={textareaClass} rows={3} {...register('notes')} />
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" type="button" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {defaultValues ? `${t('common.edit')} ${t('caseManagement.educationRecords')}` : `${t('common.save')} ${t('caseManagement.educationRecords')}`}
        </Button>
      </div>
    </form>
  );
}
