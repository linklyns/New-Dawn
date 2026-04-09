import { useMemo, useEffect, useState } from 'react';
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
  Legend,
} from 'recharts';
import { api } from '../../lib/api';
import { smartMatch } from '../../lib/smartSearch';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import type { HealthWellbeingRecord } from '../../types/models';
import type { PagedResult } from '../../types/api';

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

const healthSchema = z.object({
  recordDate: z.string().min(1, 'Required'),
  generalHealthScore: z.coerce.number().min(1).max(5),
  nutritionScore: z.coerce.number().min(1).max(5),
  sleepQualityScore: z.coerce.number().min(1).max(5),
  energyLevelScore: z.coerce.number().min(1).max(5),
  heightCm: z.coerce.number().min(1, 'Required'),
  weightKg: z.coerce.number().min(1, 'Required'),
  bmi: z.coerce.number().min(0),
  medicalCheckupDone: z.boolean().default(false),
  dentalCheckupDone: z.boolean().default(false),
  psychologicalCheckupDone: z.boolean().default(false),
  notes: z.string().optional().default(''),
});

type HealthFormData = z.infer<typeof healthSchema>;

export function HealthRecordsPage() {
  const { residentId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HealthWellbeingRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HealthWellbeingRecord | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(100);
  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading } = useQuery({
    queryKey: ['health-records', residentId, page, pageSize],
    queryFn: () =>
      api.get<PagedResult<HealthWellbeingRecord>>(
        `/api/health-records?residentId=${residentId}&page=${page}&pageSize=${pageSize}`,
      ),
  });

  const records = useMemo(() => {
    let items = data?.items ?? [];
    if (search.trim()) {
      items = items.filter((r) =>
        smartMatch(search, [
          r.recordDate, r.generalHealthScore, r.nutritionScore,
          r.sleepQualityScore, r.energyLevelScore, r.heightCm,
          r.weightKg, r.bmi, r.notes,
        ]),
      );
    }
    return [...items].sort((a, b) => {
      const cmp = a.recordDate.localeCompare(b.recordDate);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, search, sortDir]);

  const createMutation = useMutation({
    mutationFn: (body: HealthFormData) =>
      api.post('/api/health-records', { ...body, residentId: Number(residentId) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-records', residentId] });
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (body: HealthFormData & { healthRecordId: number }) =>
      api.put(`/api/health-records/${body.healthRecordId}`, { ...body, residentId: Number(residentId) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-records', residentId] });
      setEditingRecord(null);
      setFormOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/health-records/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-records', residentId] });
      setDeleteTarget(null);
    },
  });

  function openCreate() {
    setEditingRecord(null);
    setFormOpen(true);
  }

  function openEdit(rec: HealthWellbeingRecord) {
    setEditingRecord(rec);
    setFormOpen(true);
  }

  function handleFormSubmit(formData: HealthFormData) {
    if (editingRecord) {
      updateMutation.mutate({ ...formData, healthRecordId: editingRecord.healthRecordId });
    } else {
      createMutation.mutate(formData);
    }
  }

  const chartData = [...records]
    .sort((a, b) => a.recordDate.localeCompare(b.recordDate))
    .map((r) => ({
      date: formatDate(r.recordDate),
      health: r.generalHealthScore,
      nutrition: r.nutritionScore,
      sleep: r.sleepQualityScore,
      energy: r.energyLevelScore,
    }));

  const columns = [
    {
      key: 'recordDate',
      header: 'Date',
      render: (row: Record<string, unknown>) => formatDate(row.recordDate as string),
    },
    { key: 'generalHealthScore', header: 'Health' },
    { key: 'nutritionScore', header: 'Nutrition' },
    { key: 'sleepQualityScore', header: 'Sleep' },
    { key: 'energyLevelScore', header: 'Energy' },
    {
      key: 'bmi',
      header: 'BMI',
      render: (row: Record<string, unknown>) => (row.bmi as number).toFixed(1),
    },
    {
      key: 'checkups',
      header: 'Checkups',
      render: (row: Record<string, unknown>) => {
        const checks: string[] = [];
        if (row.medicalCheckupDone) checks.push('Med');
        if (row.dentalCheckupDone) checks.push('Den');
        if (row.psychologicalCheckupDone) checks.push('Psy');
        return checks.length > 0 ? checks.join(', ') : '--';
      },
    },
    {
      key: 'actions',
      header: '',
      render: (row: Record<string, unknown>) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(row as unknown as HealthWellbeingRecord)}>
            <Pencil size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(row as unknown as HealthWellbeingRecord)}>
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Health Records"
        subtitle="Track health and wellbeing metrics"
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus size={16} />
            Add Record
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
            {editingRecord ? 'Edit Record' : 'New Record'}
          </h3>
          {(createMutation.isError || updateMutation.isError) && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {((createMutation.error ?? updateMutation.error) as Error).message}
            </div>
          )}
          <HealthForm
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

      {/* Multi-line Chart */}
      {chartData.length > 1 && (
        <Card className="mb-6">
          <h3 className="mb-4 font-heading text-base font-semibold text-slate-navy dark:text-white">
            Wellbeing Scores Over Time
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="health" stroke="#22c55e" strokeWidth={2} name="Health" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="nutrition" stroke="#f59e0b" strokeWidth={2} name="Nutrition" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="sleep" stroke="#8b5cf6" strokeWidth={2} name="Sleep" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="energy" stroke="#38bdf8" strokeWidth={2} name="Energy" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card>
        <Table
          columns={columns}
          data={records as unknown as Record<string, unknown>[]}
          loading={isLoading}
          emptyMessage="No health records found."
          page={page}
          pageSize={pageSize}
          totalPages={data?.totalPages ?? 1}
          totalCount={records.length}
          onPageChange={setPage}
          onPageSizeChange={() => {}}
        />
      </Card>

      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete Health Record"
        confirmText="Delete"
        confirmVariant="danger"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.healthRecordId)}
      >
        <p className="text-sm text-warm-gray">
          Are you sure you want to delete this health record? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

/* ── Inline Form ─────────────────────────────────────────────── */

function HealthForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  defaultValues?: Partial<HealthWellbeingRecord>;
  onSubmit: (data: HealthFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<HealthFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(healthSchema) as any,
    defaultValues: {
      recordDate: defaultValues?.recordDate?.split('T')[0] ?? '',
      generalHealthScore: defaultValues?.generalHealthScore ?? 3,
      nutritionScore: defaultValues?.nutritionScore ?? 3,
      sleepQualityScore: defaultValues?.sleepQualityScore ?? 3,
      energyLevelScore: defaultValues?.energyLevelScore ?? 3,
      heightCm: defaultValues?.heightCm ?? 0,
      weightKg: defaultValues?.weightKg ?? 0,
      bmi: defaultValues?.bmi ?? 0,
      medicalCheckupDone: defaultValues?.medicalCheckupDone ?? false,
      dentalCheckupDone: defaultValues?.dentalCheckupDone ?? false,
      psychologicalCheckupDone: defaultValues?.psychologicalCheckupDone ?? false,
      notes: defaultValues?.notes ?? '',
    },
  });

  const heightCm = watch('heightCm');
  const weightKg = watch('weightKg');

  useEffect(() => {
    if (heightCm > 0 && weightKg > 0) {
      const heightM = heightCm / 100;
      const calculatedBmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10;
      setValue('bmi', calculatedBmi);
    }
  }, [heightCm, weightKg, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Input
          label="Record Date"
          type="date"
          error={errors.recordDate?.message}
          {...register('recordDate')}
        />
        <Input
          label="General Health Score (1-5)"
          type="number"
          error={errors.generalHealthScore?.message}
          {...register('generalHealthScore')}
        />
        <Input
          label="Nutrition Score (1-5)"
          type="number"
          error={errors.nutritionScore?.message}
          {...register('nutritionScore')}
        />
        <Input
          label="Sleep Quality Score (1-5)"
          type="number"
          error={errors.sleepQualityScore?.message}
          {...register('sleepQualityScore')}
        />
        <Input
          label="Energy Level Score (1-5)"
          type="number"
          error={errors.energyLevelScore?.message}
          {...register('energyLevelScore')}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Input
          label="Height (cm)"
          type="number"
          step="0.1"
          error={errors.heightCm?.message}
          {...register('heightCm')}
        />
        <Input
          label="Weight (kg)"
          type="number"
          step="0.1"
          error={errors.weightKg?.message}
          {...register('weightKg')}
        />
        <Input
          label="BMI (auto-calculated)"
          type="number"
          step="0.1"
          readOnly
          {...register('bmi')}
        />
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm text-slate-navy dark:text-white">
          <input
            type="checkbox"
            className={checkboxClass}
            checked={watch('medicalCheckupDone')}
            onChange={(e) => setValue('medicalCheckupDone', e.target.checked)}
          />
          Medical Checkup Done
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-navy dark:text-white">
          <input
            type="checkbox"
            className={checkboxClass}
            checked={watch('dentalCheckupDone')}
            onChange={(e) => setValue('dentalCheckupDone', e.target.checked)}
          />
          Dental Checkup Done
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-navy dark:text-white">
          <input
            type="checkbox"
            className={checkboxClass}
            checked={watch('psychologicalCheckupDone')}
            onChange={(e) => setValue('psychologicalCheckupDone', e.target.checked)}
          />
          Psychological Checkup Done
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-navy dark:text-white">Notes</label>
        <textarea className={textareaClass} rows={3} {...register('notes')} />
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {defaultValues ? 'Update Record' : 'Save Record'}
        </Button>
      </div>
    </form>
  );
}
