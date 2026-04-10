import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Plus, Pencil, Trash2, Search, ArrowUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { smartMatch } from '../../lib/smartSearch';
import { getPageSizeOptions } from '../../lib/pagination';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import type { Safehouse, SafehouseMonthlyMetric } from '../../types/models';
import type { PagedResult } from '../../types/api';

function fmtDate(d: string | null | undefined): string {
  if (!d) return '--';
  try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return d; }
}

function statusVariant(s: string): 'success' | 'neutral' | 'danger' {
  switch (s) {
    case 'Active': return 'success';
    case 'Inactive': return 'neutral';
    case 'Closed': return 'danger';
    default: return 'neutral';
  }
}

const selectClass = 'rounded-lg border border-slate-navy/20 bg-white px-3 py-2 text-sm text-slate-navy focus:border-golden-honey focus:outline-none dark:border-white/20 dark:bg-dark-surface dark:text-white';
const inputClass = 'w-full rounded-lg border border-slate-navy/20 bg-white px-3 py-2 text-sm text-slate-navy focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-dark-surface dark:text-white';

/* ───────── Safehouses Tab ───────── */

const emptySafehouse: Omit<Safehouse, 'safehouseId'> = {
  safehouseCode: '', name: '', region: '', city: '', province: '', country: 'Philippines',
  openDate: new Date().toISOString().slice(0, 10), status: 'Active',
  capacityGirls: 0, capacityStaff: 0, currentOccupancy: 0, notes: null,
};

type ShSortKey = 'name' | 'region' | 'status' | 'occupancy';

function SafehousesTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState<ShSortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Safehouse | null>(null);
  const [form, setForm] = useState(emptySafehouse);
  const [deleteTarget, setDeleteTarget] = useState<Safehouse | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['safehouses'],
    queryFn: () => api.get<PagedResult<Safehouse>>('/api/safehouses?page=1&pageSize=500'),
  });

  const save = useMutation({
    mutationFn: (s: Safehouse | Omit<Safehouse, 'safehouseId'>) =>
      'safehouseId' in s && (s as Safehouse).safehouseId
        ? api.put(`/api/safehouses/${(s as Safehouse).safehouseId}`, s)
        : api.post('/api/safehouses', s),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['safehouses'] }); closeModal(); },
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/api/safehouses/${id}?confirm=true`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['safehouses'] }); setDeleteTarget(null); },
  });

  function openCreate() { setEditing(null); setForm({ ...emptySafehouse }); setModalOpen(true); }
  function openEdit(s: Safehouse) {
    setEditing(s);
    setForm({
      safehouseCode: s.safehouseCode, name: s.name, region: s.region, city: s.city,
      province: s.province, country: s.country, openDate: s.openDate, status: s.status,
      capacityGirls: s.capacityGirls, capacityStaff: s.capacityStaff,
      currentOccupancy: s.currentOccupancy, notes: s.notes,
    });
    setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); setEditing(null); }
  function handleSave() {
    if (!form.name.trim()) return;
    if (editing) save.mutate({ ...form, safehouseId: editing.safehouseId } as Safehouse);
    else save.mutate(form);
  }

  const handlePageSizeChange = (sz: number) => { setPageSize(sz); setPage(1); };

  const processed = useMemo(() => {
    let items = data?.items ?? [];
    if (statusFilter) items = items.filter((s) => s.status === statusFilter);
    if (search.trim()) {
      items = items.filter((s) =>
        smartMatch(search, [s.safehouseCode, s.name, s.region, s.city, s.province, s.status]),
      );
    }
    return [...items].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortKey === 'region') cmp = a.region.localeCompare(b.region);
      else if (sortKey === 'status') cmp = a.status.localeCompare(b.status);
      else if (sortKey === 'occupancy') cmp = a.currentOccupancy - b.currentOccupancy;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, search, statusFilter, sortKey, sortDir]);

  function toggleSort(key: ShSortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }
  function SortBtn({ col }: { col: ShSortKey }) {
    return (
      <button className={`ml-1 inline-flex items-center hover:opacity-100 ${sortKey === col ? 'text-golden-honey opacity-100' : 'opacity-50'}`} onClick={() => toggleSort(col)} type="button">
        <ArrowUpDown size={13} />
      </button>
    );
  }

  const columns = [
    { key: 'safehouseCode', header: t('safehouses.code') },
    { key: 'name', header: <span className="flex items-center">{t('common.name')} <SortBtn col="name" /></span> },
    { key: 'region', header: <span className="flex items-center">{t('safehouses.region')} <SortBtn col="region" /></span> },
    { key: 'city', header: t('safehouses.city') },
    { key: 'province', header: t('safehouses.province') },
    {
      key: 'openDate', header: t('safehouses.openDate'),
      render: (row: Record<string, unknown>) => fmtDate(row.openDate as string),
    },
    {
      key: 'status',
      header: <span className="flex items-center">{t('common.status')} <SortBtn col="status" /></span>,
      render: (row: Record<string, unknown>) => (
        <Badge variant={statusVariant(row.status as string)}>
          {row.status === 'Active'
            ? t('common.active')
            : row.status === 'Inactive'
              ? t('common.inactive')
              : row.status === 'Closed'
                ? t('common.closed')
                : (row.status as string)}
        </Badge>
      ),
    },
    {
      key: 'currentOccupancy',
      header: <span className="flex items-center">{t('safehouses.occupancy')} <SortBtn col="occupancy" /></span>,
      render: (row: Record<string, unknown>) => `${row.currentOccupancy} / ${row.capacityGirls}`,
    },
    { key: 'capacityStaff', header: t('safehouses.staffCap') },
    {
      key: '_actions', header: '',
      render: (row: Record<string, unknown>) => {
        const s = row as unknown as Safehouse;
        return (
          <div className="flex items-center gap-1">
            <button className="rounded p-1 hover:bg-sky-blue/20" title="Edit" onClick={(e) => { e.stopPropagation(); openEdit(s); }}>
              <Pencil size={15} className="text-slate-navy dark:text-white" />
            </button>
            <button className="rounded p-1 hover:bg-coral-pink/30" title="Delete" onClick={(e) => { e.stopPropagation(); setDeleteTarget(s); }}>
              <Trash2 size={15} className="text-red-500" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray dark:text-white/40" />
          <input
            className="w-full rounded-lg border border-slate-navy/20 bg-white py-2 pl-9 pr-3 text-sm text-slate-navy placeholder:text-warm-gray/60 focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-dark-surface dark:text-white"
            placeholder={t('safehouses.searchSafehouses')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className={selectClass} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">{t('safehouses.allStatuses')}</option>
          <option value="Active">{t('common.active')}</option>
          <option value="Inactive">{t('common.inactive')}</option>
          <option value="Closed">{t('common.closed')}</option>
        </select>
        <Button onClick={openCreate} className="gap-2"><Plus size={16} /> {t('safehouses.addSafehouse')}</Button>
      </div>

      <Table
        columns={columns}
        data={processed.slice((page - 1) * pageSize, page * pageSize) as unknown as Record<string, unknown>[]}
        loading={isLoading}
        emptyMessage="No safehouses found."
        page={page}
        pageSize={pageSize}
        totalPages={Math.max(1, Math.ceil(processed.length / pageSize))}
        totalCount={processed.length}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        pageSizeOptions={getPageSizeOptions(processed.length)}
      />

      {/* Create / Edit Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? 'Edit Safehouse' : 'Add Safehouse'} size="lg" hideFooter>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">{t('safehouses.code')} *</label>
            <input className={inputClass} value={form.safehouseCode} onChange={(e) => setForm({ ...form, safehouseCode: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">{t('common.name')} *</label>
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">{t('safehouses.region')}</label>
            <input className={inputClass} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">{t('safehouses.city')}</label>
            <input className={inputClass} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">{t('safehouses.province')}</label>
            <input className={inputClass} value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">Country</label>
            <input className={inputClass} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">{t('safehouses.openDate')}</label>
            <input className={inputClass} type="date" value={form.openDate?.slice(0, 10) ?? ''} onChange={(e) => setForm({ ...form, openDate: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">{t('common.status')}</label>
            <select className={selectClass + ' w-full'} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="Active">{t('common.active')}</option>
              <option value="Inactive">{t('common.inactive')}</option>
              <option value="Closed">{t('common.closed')}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">Capacity (Girls)</label>
            <input className={inputClass} type="number" min={0} value={form.capacityGirls} onChange={(e) => setForm({ ...form, capacityGirls: +e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">Capacity (Staff)</label>
            <input className={inputClass} type="number" min={0} value={form.capacityStaff} onChange={(e) => setForm({ ...form, capacityStaff: +e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">Current Occupancy</label>
            <input className={inputClass} type="number" min={0} value={form.currentOccupancy} onChange={(e) => setForm({ ...form, currentOccupancy: +e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">Notes</label>
            <textarea className={inputClass + ' min-h-[60px]'} value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value || null })} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={closeModal}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={save.isPending}>{editing ? t('common.save') : t('safehouses.addSafehouse')}</Button>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Safehouse" confirmText={t('common.delete')} confirmVariant="danger" onConfirm={() => deleteTarget && remove.mutate(deleteTarget.safehouseId)}>
        <p className="text-sm text-slate-navy dark:text-white">Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.</p>
      </Modal>
    </>
  );
}

/* ───────── Metrics Tab ───────── */

const emptyMetric: Omit<SafehouseMonthlyMetric, 'metricId'> = {
  safehouseId: 0, monthStart: '', monthEnd: '', activeResidents: 0,
  avgEducationProgress: null, avgHealthScore: null, processRecordingCount: 0,
  homeVisitationCount: 0, incidentCount: 0, notes: null,
};

type MtSortKey = 'month' | 'residents' | 'incidents';

function MetricsTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [shFilter, setShFilter] = useState('');
  const [sortKey, setSortKey] = useState<MtSortKey>('month');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SafehouseMonthlyMetric | null>(null);
  const [form, setForm] = useState(emptyMetric);
  const [deleteTarget, setDeleteTarget] = useState<SafehouseMonthlyMetric | null>(null);

  const { data: shData } = useQuery({
    queryKey: ['safehouses'],
    queryFn: () => api.get<PagedResult<Safehouse>>('/api/safehouses?page=1&pageSize=500'),
  });
  const shMap = useMemo(() => {
    const m = new Map<number, string>();
    (shData?.items ?? []).forEach((s) => m.set(s.safehouseId, `${s.safehouseCode} - ${s.name}`));
    return m;
  }, [shData]);

  const { data, isLoading } = useQuery({
    queryKey: ['safehouse-metrics'],
    queryFn: () => api.get<PagedResult<SafehouseMonthlyMetric>>('/api/safehouse-metrics?page=1&pageSize=500'),
  });

  const save = useMutation({
    mutationFn: (m: SafehouseMonthlyMetric | Omit<SafehouseMonthlyMetric, 'metricId'>) =>
      'metricId' in m && (m as SafehouseMonthlyMetric).metricId
        ? api.put(`/api/safehouse-metrics/${(m as SafehouseMonthlyMetric).metricId}`, m)
        : api.post('/api/safehouse-metrics', m),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['safehouse-metrics'] }); closeModal(); },
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/api/safehouse-metrics/${id}?confirm=true`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['safehouse-metrics'] }); setDeleteTarget(null); },
  });

  function openCreate() { setEditing(null); setForm({ ...emptyMetric }); setModalOpen(true); }
  function openEdit(m: SafehouseMonthlyMetric) {
    setEditing(m);
    setForm({
      safehouseId: m.safehouseId, monthStart: m.monthStart, monthEnd: m.monthEnd,
      activeResidents: m.activeResidents, avgEducationProgress: m.avgEducationProgress,
      avgHealthScore: m.avgHealthScore, processRecordingCount: m.processRecordingCount,
      homeVisitationCount: m.homeVisitationCount, incidentCount: m.incidentCount, notes: m.notes,
    });
    setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); setEditing(null); }
  function handleSave() {
    if (!form.safehouseId) return;
    if (editing) save.mutate({ ...form, metricId: editing.metricId } as SafehouseMonthlyMetric);
    else save.mutate(form);
  }

  const handlePageSizeChange = (sz: number) => { setPageSize(sz); setPage(1); };

  const processed = useMemo(() => {
    let items = data?.items ?? [];
    if (shFilter) items = items.filter((m) => m.safehouseId === +shFilter);
    if (search.trim()) {
      items = items.filter((m) =>
        smartMatch(search, [shMap.get(m.safehouseId) ?? '', m.monthStart, String(m.activeResidents)]),
      );
    }
    return [...items].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'month') cmp = a.monthStart.localeCompare(b.monthStart);
      else if (sortKey === 'residents') cmp = a.activeResidents - b.activeResidents;
      else if (sortKey === 'incidents') cmp = a.incidentCount - b.incidentCount;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, search, shFilter, sortKey, sortDir, shMap]);

  function toggleSort(key: MtSortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  }
  function SortBtn({ col }: { col: MtSortKey }) {
    return (
      <button className={`ml-1 inline-flex items-center hover:opacity-100 ${sortKey === col ? 'text-golden-honey opacity-100' : 'opacity-50'}`} onClick={() => toggleSort(col)} type="button">
        <ArrowUpDown size={13} />
      </button>
    );
  }

  const columns = [
    {
      key: 'safehouseId', header: t('residents.safehouse'),
      render: (row: Record<string, unknown>) => shMap.get(Number(row.safehouseId)) ?? `#${row.safehouseId}`,
    },
    {
      key: 'monthStart',
      header: <span className="flex items-center">Month <SortBtn col="month" /></span>,
      render: (row: Record<string, unknown>) => fmtDate(row.monthStart as string),
    },
    {
      key: 'activeResidents',
      header: <span className="flex items-center">{t('nav.residents')} <SortBtn col="residents" /></span>,
    },
    {
      key: 'avgEducationProgress', header: 'Edu Prog',
      render: (row: Record<string, unknown>) => row.avgEducationProgress != null ? `${Number(row.avgEducationProgress).toFixed(1)}%` : '--',
    },
    {
      key: 'avgHealthScore', header: 'Health',
      render: (row: Record<string, unknown>) => row.avgHealthScore != null ? `${Number(row.avgHealthScore).toFixed(1)}/10` : '--',
    },
    { key: 'processRecordingCount', header: t('caseManagement.processRecordings') },
    { key: 'homeVisitationCount', header: t('caseManagement.homeVisitations') },
    {
      key: 'incidentCount',
      header: <span className="flex items-center">Incidents <SortBtn col="incidents" /></span>,
    },
    {
      key: '_actions', header: '',
      render: (row: Record<string, unknown>) => {
        const m = row as unknown as SafehouseMonthlyMetric;
        return (
          <div className="flex items-center gap-1">
            <button className="rounded p-1 hover:bg-sky-blue/20" title="Edit" onClick={(e) => { e.stopPropagation(); openEdit(m); }}>
              <Pencil size={15} className="text-slate-navy dark:text-white" />
            </button>
            <button className="rounded p-1 hover:bg-coral-pink/30" title="Delete" onClick={(e) => { e.stopPropagation(); setDeleteTarget(m); }}>
              <Trash2 size={15} className="text-red-500" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray dark:text-white/40" />
          <input
            className="w-full rounded-lg border border-slate-navy/20 bg-white py-2 pl-9 pr-3 text-sm text-slate-navy placeholder:text-warm-gray/60 focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-dark-surface dark:text-white"
            placeholder="Smart search (e.g. SH-001, 2025)"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className={selectClass} value={shFilter} onChange={(e) => { setShFilter(e.target.value); setPage(1); }}>
          <option value="">{t('nav.safehouses')}</option>
          {[...(shData?.items ?? [])].sort((a, b) => a.name.localeCompare(b.name)).map((s) => (
            <option key={s.safehouseId} value={s.safehouseId}>{s.safehouseCode} - {s.name}</option>
          ))}
        </select>
        <Button onClick={openCreate} className="gap-2"><Plus size={16} /> Add Metric</Button>
      </div>

      <Table
        columns={columns}
        data={processed.slice((page - 1) * pageSize, page * pageSize) as unknown as Record<string, unknown>[]}
        loading={isLoading}
        emptyMessage="No metrics found."
        page={page}
        pageSize={pageSize}
        totalPages={Math.max(1, Math.ceil(processed.length / pageSize))}
        totalCount={processed.length}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        pageSizeOptions={getPageSizeOptions(processed.length)}
      />

      <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? 'Edit Metric' : 'Add Metric'} size="lg" hideFooter>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">{t('residents.safehouse')} *</label>
            <select className={selectClass + ' w-full'} value={form.safehouseId} onChange={(e) => setForm({ ...form, safehouseId: +e.target.value })}>
              <option value={0}>-- Select --</option>
              {[...(shData?.items ?? [])].sort((a, b) => a.name.localeCompare(b.name)).map((s) => (
                <option key={s.safehouseId} value={s.safehouseId}>{s.safehouseCode} - {s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">Month Start</label>
            <input className={inputClass} type="date" value={form.monthStart?.slice(0, 10) ?? ''} onChange={(e) => setForm({ ...form, monthStart: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">Month End</label>
            <input className={inputClass} type="date" value={form.monthEnd?.slice(0, 10) ?? ''} onChange={(e) => setForm({ ...form, monthEnd: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">Active Residents</label>
            <input className={inputClass} type="number" min={0} value={form.activeResidents} onChange={(e) => setForm({ ...form, activeResidents: +e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">Avg Education Progress (%)</label>
            <input className={inputClass} type="number" min={0} max={100} step={0.1} value={form.avgEducationProgress ?? ''} onChange={(e) => setForm({ ...form, avgEducationProgress: e.target.value ? +e.target.value : null })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">Avg Health Score (/10)</label>
            <input className={inputClass} type="number" min={0} max={10} step={0.1} value={form.avgHealthScore ?? ''} onChange={(e) => setForm({ ...form, avgHealthScore: e.target.value ? +e.target.value : null })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">Process Recordings</label>
            <input className={inputClass} type="number" min={0} value={form.processRecordingCount} onChange={(e) => setForm({ ...form, processRecordingCount: +e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">Home Visitations</label>
            <input className={inputClass} type="number" min={0} value={form.homeVisitationCount} onChange={(e) => setForm({ ...form, homeVisitationCount: +e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">Incidents</label>
            <input className={inputClass} type="number" min={0} value={form.incidentCount} onChange={(e) => setForm({ ...form, incidentCount: +e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">Notes</label>
            <textarea className={inputClass + ' min-h-[60px]'} value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value || null })} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={closeModal}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={save.isPending}>{editing ? 'Save Changes' : 'Create Metric'}</Button>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Metric" confirmText={t('common.delete')} confirmVariant="danger" onConfirm={() => deleteTarget && remove.mutate(deleteTarget.metricId)}>
        <p className="text-sm text-slate-navy dark:text-white">Are you sure you want to delete this metric record? This action cannot be undone.</p>
      </Modal>
    </>
  );
}

/* ───────── Main Page ───────── */

export function SafehousesPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'safehouses' | 'metrics'>('safehouses');

  const tabClass = (t: string) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === t ? 'bg-white text-slate-navy border border-b-0 border-slate-navy/20 dark:bg-dark-surface dark:text-white dark:border-white/20' : 'text-warm-gray hover:text-slate-navy dark:hover:text-white'}`;

  return (
    <div>
      <PageHeader title={t('safehouses.title')} subtitle={t('safehouses.subtitle')} />

      <div className="mb-0 flex gap-1 border-b border-slate-navy/10 dark:border-white/10">
        <button className={tabClass('safehouses')} onClick={() => setTab('safehouses')}>{t('safehouses.title')}</button>
        <button className={tabClass('metrics')} onClick={() => setTab('metrics')}>Monthly Metrics</button>
      </div>

      <Card className="rounded-tl-none">
        {tab === 'safehouses' ? <SafehousesTab /> : <MetricsTab />}
      </Card>
    </div>
  );
}
