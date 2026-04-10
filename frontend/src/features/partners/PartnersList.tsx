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
import type { Partner } from '../../types/models';
import type { PagedResult } from '../../types/api';

function formatDate(d: string | null | undefined): string {
  if (!d) return '--';
  try {
    return format(parseISO(d), 'MMM d, yyyy');
  } catch {
    return d;
  }
}

function statusVariant(s: string): 'success' | 'neutral' | 'danger' {
  switch (s) {
    case 'Active': return 'success';
    case 'Inactive': return 'neutral';
    case 'Suspended': return 'danger';
    default: return 'neutral';
  }
}

function typeVariant(t: string): 'info' | 'success' | 'warning' | 'neutral' {
  switch (t) {
    case 'Organization': return 'info';
    case 'Individual': return 'success';
    default: return 'neutral';
  }
}

const selectClass = 'rounded-lg border border-slate-navy/20 bg-white px-3 py-2 text-sm text-slate-navy focus:border-golden-honey focus:outline-none dark:border-white/20 dark:bg-dark-surface dark:text-white';
const inputClass = 'w-full rounded-lg border border-slate-navy/20 bg-white px-3 py-2 text-sm text-slate-navy focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-dark-surface dark:text-white';

const emptyPartner: Omit<Partner, 'partnerId'> = {
  partnerName: '', partnerType: 'Organization', roleType: 'SafehouseOps',
  contactName: '', email: '', phone: '', region: '', status: 'Active',
  startDate: new Date().toISOString().slice(0, 10), endDate: null, notes: '',
};

type SortKey = 'name' | 'type' | 'status' | 'date';

export function PartnersList() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [form, setForm] = useState(emptyPartner);
  const [deleteTarget, setDeleteTarget] = useState<Partner | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['partners'],
    queryFn: () => api.get<PagedResult<Partner>>('/api/partners?page=1&pageSize=500'),
  });

  const save = useMutation({
    mutationFn: (p: Partner | Omit<Partner, 'partnerId'>) =>
      'partnerId' in p && (p as Partner).partnerId
        ? api.put(`/api/partners/${(p as Partner).partnerId}`, p)
        : api.post('/api/partners', p),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['partners'] }); closeModal(); },
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/api/partners/${id}?confirm=true`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['partners'] }); setDeleteTarget(null); },
  });

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyPartner });
    setModalOpen(true);
  }

  function openEdit(p: Partner) {
    setEditing(p);
    setForm({
      partnerName: p.partnerName, partnerType: p.partnerType, roleType: p.roleType,
      contactName: p.contactName, email: p.email, phone: p.phone, region: p.region,
      status: p.status, startDate: p.startDate, endDate: p.endDate, notes: p.notes,
    });
    setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); setEditing(null); }

  function handleSave() {
    if (!form.partnerName.trim()) return;
    if (editing) save.mutate({ ...form, partnerId: editing.partnerId } as Partner);
    else save.mutate(form);
  }

  const handlePageSizeChange = (newPageSize: number) => { setPageSize(newPageSize); setPage(1); };

  const processed = useMemo(() => {
    let items = data?.items ?? [];
    if (statusFilter) items = items.filter((p) => p.status === statusFilter);
    if (search.trim()) {
      items = items.filter((p) =>
        smartMatch(search, [p.partnerName, p.partnerType, p.roleType, p.contactName, p.email, p.region, p.status]),
      );
    }
    return [...items].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.partnerName.localeCompare(b.partnerName);
      else if (sortKey === 'type') cmp = a.partnerType.localeCompare(b.partnerType);
      else if (sortKey === 'status') cmp = a.status.localeCompare(b.status);
      else if (sortKey === 'date') cmp = a.startDate.localeCompare(b.startDate);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, search, statusFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }

  function SortBtn({ col }: { col: SortKey }) {
    return (
      <button className={`ml-1 inline-flex items-center hover:opacity-100 ${sortKey === col ? 'text-golden-honey opacity-100' : 'opacity-50'}`} onClick={() => toggleSort(col)} type="button">
        <ArrowUpDown size={13} />
      </button>
    );
  }

  const columns = [
    {
      key: 'partnerName',
      header: <span className="flex items-center">{t('partners.partnerName')} <SortBtn col="name" /></span>,
    },
    {
      key: 'partnerType',
      header: <span className="flex items-center">{t('common.type')} <SortBtn col="type" /></span>,
      render: (row: Record<string, unknown>) => (
        <Badge variant={typeVariant(row.partnerType as string)}>
          {row.partnerType === 'Organization'
            ? t('partners.organizationType')
            : row.partnerType === 'Individual'
              ? t('partners.individualType')
              : (row.partnerType as string)}
        </Badge>
      ),
    },
    { key: 'roleType', header: t('partners.role') },
    { key: 'contactName', header: t('partners.contact') },
    { key: 'email', header: t('common.email') },
    { key: 'region', header: t('partners.region') },
    {
      key: 'status',
      header: <span className="flex items-center">{t('common.status')} <SortBtn col="status" /></span>,
      render: (row: Record<string, unknown>) => (
        <Badge variant={statusVariant(row.status as string)}>
          {row.status === 'Active'
            ? t('common.active')
            : row.status === 'Inactive'
              ? t('common.inactive')
              : row.status === 'Suspended'
                ? t('partners.suspended')
                : (row.status as string)}
        </Badge>
      ),
    },
    {
      key: 'startDate',
      header: <span className="flex items-center">{t('partners.startDate')} <SortBtn col="date" /></span>,
      render: (row: Record<string, unknown>) => formatDate(row.startDate as string),
    },
    {
      key: '_actions',
      header: '',
      render: (row: Record<string, unknown>) => {
        const p = row as unknown as Partner;
        return (
          <div className="flex items-center gap-1">
            <button className="rounded p-1 hover:bg-sky-blue/20" title="Edit" onClick={(e) => { e.stopPropagation(); openEdit(p); }}>
              <Pencil size={15} className="text-slate-navy dark:text-white" />
            </button>
            <button className="rounded p-1 hover:bg-coral-pink/30" title="Delete" onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }}>
              <Trash2 size={15} className="text-red-500" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('partners.title')}
        subtitle={t('partners.subtitle')}
        action={<Button onClick={openCreate} className="gap-2"><Plus size={16} /> {t('partners.addPartner')}</Button>}
      />

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1 sm:min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray dark:text-white/40" />
            <input
              className="w-full rounded-lg border border-slate-navy/20 bg-white py-2 pl-9 pr-3 text-sm text-slate-navy placeholder:text-warm-gray/60 focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-dark-surface dark:text-white"
              placeholder={t('partners.searchPartners')}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select className={selectClass} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">{t('safehouses.allStatuses')}</option>
            <option value="Active">{t('common.active')}</option>
            <option value="Inactive">{t('common.inactive')}</option>
          </select>
        </div>

        <Table
          columns={columns}
          data={processed.slice((page - 1) * pageSize, page * pageSize) as unknown as Record<string, unknown>[]}
          loading={isLoading}
          emptyMessage="No partners found."
          page={page}
          pageSize={pageSize}
          totalPages={Math.max(1, Math.ceil(processed.length / pageSize))}
          totalCount={processed.length}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={getPageSizeOptions(processed.length)}
        />
      </Card>

      {/* Create / Edit Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? 'Edit Partner' : 'Add Partner'} size="lg" hideFooter>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">Partner Name *</label>
            <input className={inputClass} value={form.partnerName} onChange={(e) => setForm({ ...form, partnerName: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">{t('common.type')}</label>
            <select className={selectClass + ' w-full'} value={form.partnerType} onChange={(e) => setForm({ ...form, partnerType: e.target.value })}>
              <option value="Organization">{t('partners.organizationType')}</option>
              <option value="Individual">{t('partners.individualType')}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">{t('partners.role')}</label>
            <select className={selectClass + ' w-full'} value={form.roleType} onChange={(e) => setForm({ ...form, roleType: e.target.value })}>
              <option value="SafehouseOps">Safehouse Ops</option>
              <option value="Education">Education</option>
              <option value="Evaluation">Evaluation</option>
              <option value="FindSafehouse">Find Safehouse</option>
              <option value="Logistics">Logistics</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Transport">Transport</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">Contact Name</label>
            <input className={inputClass} value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">{t('common.email')}</label>
            <input className={inputClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">Phone</label>
            <input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">{t('partners.region')}</label>
            <input className={inputClass} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">{t('common.status')}</label>
            <select className={selectClass + ' w-full'} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="Active">{t('common.active')}</option>
              <option value="Inactive">{t('common.inactive')}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">{t('partners.startDate')}</label>
            <input className={inputClass} type="date" value={form.startDate?.slice(0, 10) ?? ''} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">Notes</label>
            <textarea className={inputClass + ' min-h-[60px]'} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={closeModal}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={save.isPending}>{editing ? t('common.save') : t('partners.addPartner')}</Button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Partner"
        confirmText={t('common.delete')}
        confirmVariant="danger"
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.partnerId)}
      >
        <p className="text-sm text-slate-navy dark:text-white">
          Are you sure you want to delete <strong>{deleteTarget?.partnerName}</strong>? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
