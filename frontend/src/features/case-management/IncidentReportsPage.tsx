import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, ArrowUpDown, Plus, Pencil, Search, Trash2, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { api } from '../../lib/api';
import { smartMatch } from '../../lib/smartSearch';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import type { IncidentReport } from '../../types/models';
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

const incidentTypes = ['Behavioral', 'Medical', 'Safety', 'Abuse', 'Runaway', 'Property', 'Other'] as const;
const severityLevels = ['Low', 'Medium', 'High'] as const;

function severityVariant(s: string): 'success' | 'warning' | 'danger' {
  switch (s) {
    case 'Low': return 'success';
    case 'Medium': return 'warning';
    case 'High': return 'danger';
    default: return 'warning';
  }
}

const incidentSchema = z.object({
  incidentDate: z.string().min(1, 'Required'),
  incidentType: z.string().min(1, 'Required'),
  severity: z.string().min(1, 'Required'),
  description: z.string().min(1, 'Required'),
  responseTaken: z.string().min(1, 'Required'),
  resolved: z.boolean().default(false),
  resolutionDate: z.string().nullable().optional(),
  reportedBy: z.string().min(1, 'Required'),
  followUpRequired: z.boolean().default(false),
  safehouseId: z.coerce.number().min(0).optional(),
});

type IncidentFormData = z.infer<typeof incidentSchema>;

export function IncidentReportsPage() {
  const { residentId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<IncidentReport | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IncidentReport | null>(null);

  // Filters & search
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [resolvedFilter, setResolvedFilter] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page] = useState(1);
  const [pageSize] = useState(100);

  const { data, isLoading } = useQuery({
    queryKey: ['incident-reports', residentId, page, pageSize],
    queryFn: () =>
      api.get<PagedResult<IncidentReport>>(
        `/api/incident-reports?residentId=${residentId}&page=${page}&pageSize=${pageSize}`,
      ),
  });

  const reports = useMemo(() => {
    const items = data?.items ?? [];
    const filtered = items.filter((r) => {
      if (typeFilter && r.incidentType !== typeFilter) return false;
      if (severityFilter && r.severity !== severityFilter) return false;
      if (resolvedFilter === 'true' && !r.resolved) return false;
      if (resolvedFilter === 'false' && r.resolved) return false;
      return smartMatch(search, [r.incidentDate, r.incidentType, r.severity, r.description, r.responseTaken, r.reportedBy, r.resolutionDate]);
    });
    return [...filtered].sort((a, b) => {
      const da = a.incidentDate ?? '';
      const db = b.incidentDate ?? '';
      return sortDir === 'desc' ? db.localeCompare(da) : da.localeCompare(db);
    });
  }, [data, typeFilter, severityFilter, resolvedFilter, search, sortDir]);

  const createMutation = useMutation({
    mutationFn: (body: IncidentFormData) =>
      api.post('/api/incident-reports', { ...body, residentId: Number(residentId) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident-reports', residentId] });
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (body: IncidentFormData & { incidentId: number }) =>
      api.put(`/api/incident-reports/${body.incidentId}`, { ...body, residentId: Number(residentId) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident-reports', residentId] });
      setEditingReport(null);
      setFormOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/incident-reports/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident-reports', residentId] });
      setDeleteTarget(null);
    },
  });

  function openCreate() {
    setEditingReport(null);
    setFormOpen(true);
  }

  function openEdit(report: IncidentReport) {
    setEditingReport(report);
    setFormOpen(true);
  }

  function handleFormSubmit(formData: IncidentFormData) {
    if (editingReport) {
      updateMutation.mutate({ ...formData, incidentId: editingReport.incidentId });
    } else {
      createMutation.mutate(formData);
    }
  }

  return (
    <div>
      <PageHeader
        title="Incident Reports"
        subtitle="Log and track incident reports"
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus size={16} />
            Add Report
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
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-navy/20 bg-white py-1.5 pl-8 pr-3 text-sm text-slate-navy placeholder:text-warm-gray/60 focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-dark-surface dark:text-white"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-slate-navy/20 bg-white px-3 py-1.5 text-sm text-slate-navy focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-dark-surface dark:text-white"
        >
          <option value="">All Types</option>
          {incidentTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="rounded-lg border border-slate-navy/20 bg-white px-3 py-1.5 text-sm text-slate-navy focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-dark-surface dark:text-white"
        >
          <option value="">All Severities</option>
          {severityLevels.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={resolvedFilter}
          onChange={(e) => setResolvedFilter(e.target.value)}
          className="rounded-lg border border-slate-navy/20 bg-white px-3 py-1.5 text-sm text-slate-navy focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-dark-surface dark:text-white"
        >
          <option value="">All</option>
          <option value="true">Resolved</option>
          <option value="false">Unresolved</option>
        </select>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
          title={`Sort by incident date (${sortDir === 'desc' ? 'newest first' : 'oldest first'})`}
        >
          <ArrowUpDown size={14} />
          Date {sortDir === 'desc' ? '↓' : '↑'}
        </Button>
      </div>

      {formOpen && (
        <Card className="mb-6">
          <h3 className="mb-4 font-heading text-base font-semibold text-slate-navy dark:text-white">
            {editingReport ? 'Edit Report' : 'New Report'}
          </h3>
          {(createMutation.isError || updateMutation.isError) && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {((createMutation.error ?? updateMutation.error) as Error).message}
            </div>
          )}
          <IncidentForm
            defaultValues={editingReport ?? undefined}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setFormOpen(false);
              setEditingReport(null);
            }}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
          />
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : reports.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-warm-gray">
          No incident reports found.
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const isExpanded = expandedId === report.incidentId;
            return (
              <Card key={report.incidentId}>
                <div
                  className="flex cursor-pointer items-center justify-between"
                  onClick={() => setExpandedId(isExpanded ? null : report.incidentId)}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium text-slate-navy dark:text-white">
                      {formatDate(report.incidentDate)}
                    </span>
                    <Badge variant="info">{report.incidentType}</Badge>
                    <Badge variant={severityVariant(report.severity)}>{report.severity}</Badge>
                    <span className="max-w-xs truncate text-sm text-warm-gray">
                      {report.description}
                    </span>
                    <span className="text-sm">
                      {report.resolved ? (
                        <Check size={16} className="text-sage-green" />
                      ) : (
                        <X size={16} className="text-red-500" />
                      )}
                    </span>
                    <span className="text-xs text-warm-gray">{report.reportedBy}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(report);
                      }}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(report);
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
                        Full Description
                      </span>
                      <p className="mt-1 text-sm text-slate-navy dark:text-white">{report.description}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wide text-warm-gray">
                        Response Taken
                      </span>
                      <p className="mt-1 text-sm text-slate-navy dark:text-white">{report.responseTaken}</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div>
                        <span className="text-xs font-medium uppercase tracking-wide text-warm-gray">
                          Resolution Date
                        </span>
                        <p className="mt-1 text-sm text-slate-navy dark:text-white">
                          {formatDate(report.resolutionDate)}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs font-medium uppercase tracking-wide text-warm-gray">
                          Resolved
                        </span>
                        <p className="mt-1 text-sm text-slate-navy dark:text-white">
                          {report.resolved ? 'Yes' : 'No'}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs font-medium uppercase tracking-wide text-warm-gray">
                          Follow-Up Required
                        </span>
                        <p className="mt-1 text-sm text-slate-navy dark:text-white">
                          {report.followUpRequired ? 'Yes' : 'No'}
                        </p>
                      </div>
                    </div>
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
        title="Delete Incident Report"
        confirmText="Delete"
        confirmVariant="danger"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.incidentId)}
      >
        <p className="text-sm text-warm-gray">
          Are you sure you want to delete this incident report? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

/* ── Inline Form ─────────────────────────────────────────────── */

function IncidentForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  defaultValues?: Partial<IncidentReport>;
  onSubmit: (data: IncidentFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<IncidentFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(incidentSchema) as any,
    defaultValues: {
      incidentDate: defaultValues?.incidentDate?.split('T')[0] ?? '',
      incidentType: defaultValues?.incidentType ?? '',
      severity: defaultValues?.severity ?? '',
      description: defaultValues?.description ?? '',
      responseTaken: defaultValues?.responseTaken ?? '',
      resolved: defaultValues?.resolved ?? false,
      resolutionDate: defaultValues?.resolutionDate?.split('T')[0] ?? '',
      reportedBy: defaultValues?.reportedBy ?? '',
      followUpRequired: defaultValues?.followUpRequired ?? false,
      safehouseId: defaultValues?.safehouseId ?? 0,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Input
          label="Incident Date"
          type="date"
          error={errors.incidentDate?.message}
          {...register('incidentDate')}
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-navy dark:text-white">Incident Type</label>
          <select className={selectClass} {...register('incidentType')}>
            <option value="">Select...</option>
            {incidentTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {errors.incidentType?.message && (
            <p className="text-xs text-red-600">{errors.incidentType.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-navy dark:text-white">Severity</label>
          <select className={selectClass} {...register('severity')}>
            <option value="">Select...</option>
            {severityLevels.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {errors.severity?.message && (
            <p className="text-xs text-red-600">{errors.severity.message}</p>
          )}
        </div>
        <Input
          label="Reported By"
          error={errors.reportedBy?.message}
          {...register('reportedBy')}
        />
        <Input
          label="Resolution Date"
          type="date"
          {...register('resolutionDate')}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-navy dark:text-white">Description</label>
        <textarea className={textareaClass} rows={3} {...register('description')} />
        {errors.description?.message && (
          <p className="text-xs text-red-600">{errors.description.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-navy dark:text-white">Response Taken</label>
        <textarea className={textareaClass} rows={3} {...register('responseTaken')} />
        {errors.responseTaken?.message && (
          <p className="text-xs text-red-600">{errors.responseTaken.message}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm text-slate-navy dark:text-white">
          <input
            type="checkbox"
            className={checkboxClass}
            checked={watch('resolved')}
            onChange={(e) => setValue('resolved', e.target.checked)}
          />
          Resolved
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-navy dark:text-white">
          <input
            type="checkbox"
            className={checkboxClass}
            checked={watch('followUpRequired')}
            onChange={(e) => setValue('followUpRequired', e.target.checked)}
          />
          Follow-Up Required
        </label>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {defaultValues ? 'Update Report' : 'Save Report'}
        </Button>
      </div>
    </form>
  );
}
