import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { ArrowUpDown, Plus, Search } from 'lucide-react';
import { api } from '../../lib/api';
import { smartMatch } from '../../lib/smartSearch';
import { getPageSizeOptions } from '../../lib/pagination';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { useAuthStore } from '../../stores/authStore';
import type { DonationAllocation, Safehouse } from '../../types/models';
import type { PagedResult } from '../../types/api';

const selectClass =
  'w-full rounded-lg border border-slate-navy/20 bg-white px-3 py-2 text-sm text-slate-navy focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-slate-navy dark:text-white';
const textareaClass =
  'w-full rounded-lg border border-slate-navy/20 bg-white px-3 py-2 text-sm text-slate-navy placeholder:text-warm-gray/60 focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-slate-navy dark:text-white';

const programAreas = [
  'Education', 'Health', 'Livelihood', 'Psychosocial',
  'Legal', 'Reintegration', 'Operations', 'Other',
] as const;

function formatDate(d: string | null | undefined): string {
  if (!d) return '--';
  try {
    return format(parseISO(d), 'MMM d, yyyy');
  } catch {
    return d;
  }
}

const allocationSchema = z.object({
  donationId: z.number().min(1, 'Required'),
  safehouseId: z.number().min(1, 'Required'),
  programArea: z.string().min(1, 'Required'),
  amountAllocated: z.number().min(0.01, 'Must be > 0'),
  allocationDate: z.string().min(1, 'Required'),
  allocationNotes: z.string(),
});
type AllocationFormData = z.infer<typeof allocationSchema>;
type SortKey = 'date' | 'amount' | 'program' | 'safehouse';

function AllocationForm({
  safehouses, onSubmit, onCancel, isSubmitting,
}: {
  safehouses: Safehouse[];
  onSubmit: (data: AllocationFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<AllocationFormData>({
    resolver: zodResolver(allocationSchema),
    defaultValues: { allocationDate: new Date().toISOString().slice(0, 10), allocationNotes: '' },
  });

  const { data: unallocatedDonations } = useQuery({
    queryKey: ['unallocated-donations'],
    queryFn: () =>
      api.get<{ donationId: number; amount: number; donationType: string; donationDate: string; campaignName: string | null; remaining: number }[]>(
        '/api/donation-allocations/unallocated-donations',
      ),
  });

  const selectedDonationId = watch('donationId');
  const selectedDonation = (unallocatedDonations ?? []).find(
    (d) => d.donationId === Number(selectedDonationId),
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">Donation</label>
          <select
            className={selectClass}
            {...register('donationId', {
              valueAsNumber: true,
              onChange: (e) => {
                const don = (unallocatedDonations ?? []).find(
                  (d) => d.donationId === Number(e.target.value),
                );
                if (don) setValue('amountAllocated', don.remaining);
              },
            })}
          >
            <option value="">Select donation...</option>
            {(unallocatedDonations ?? []).map((d) => (
              <option key={d.donationId} value={d.donationId}>
                #{d.donationId} — PHP {d.remaining.toLocaleString()} left
                {d.campaignName ? ` (${d.campaignName})` : ''}
              </option>
            ))}
          </select>
          {errors.donationId && <p className="mt-1 text-xs text-red-500">{errors.donationId.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">Safehouse</label>
          <select className={selectClass} {...register('safehouseId', { valueAsNumber: true })}>
            <option value="">Select safehouse...</option>
            {safehouses.map((s) => (
              <option key={s.safehouseId} value={s.safehouseId}>{s.name.replace(/^Lighthouse\s+/i, '')}</option>
            ))}
          </select>
          {errors.safehouseId && <p className="mt-1 text-xs text-red-500">{errors.safehouseId.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">Program Area</label>
          <select className={selectClass} {...register('programArea')}>
            <option value="">Select area...</option>
            {programAreas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          {errors.programArea && <p className="mt-1 text-xs text-red-500">{errors.programArea.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">
            Amount (PHP)
            {selectedDonation && (
              <span className="ml-1 font-normal text-warm-gray dark:text-white/50">
                max {selectedDonation.remaining.toLocaleString()}
              </span>
            )}
          </label>
          <Input type="number" step="0.01" {...register('amountAllocated', { valueAsNumber: true })} placeholder="0.00" />
          {errors.amountAllocated && <p className="mt-1 text-xs text-red-500">{errors.amountAllocated.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">Allocation Date</label>
          <Input type="date" {...register('allocationDate')} />
          {errors.allocationDate && <p className="mt-1 text-xs text-red-500">{errors.allocationDate.message}</p>}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-navy dark:text-white">Notes</label>
        <textarea className={textareaClass} rows={2} placeholder="Optional notes..." {...register('allocationNotes')} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Allocation'}</Button>
      </div>
    </form>
  );
}

export function AllocationsList() {
  const queryClient = useQueryClient();
  const userRole = useAuthStore((s) => s.user?.role);
  const isAdmin = userRole === 'Admin';
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [search, setSearch] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [addOpen, setAddOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['donation-allocations', page, pageSize],
    queryFn: () =>
      api.get<PagedResult<DonationAllocation>>(
        `/api/donation-allocations?page=${page}&pageSize=${pageSize}`,
      ),
  });

  const { data: summary } = useQuery({
    queryKey: ['donation-allocations-summary'],
    queryFn: () =>
      api.get<{ totalDonated: number; totalAllocated: number; unallocated: number }>(
        '/api/donation-allocations/summary',
      ),
    retry: 2,
  });

  const { data: safehousesData } = useQuery({
    queryKey: ['safehouses-list'],
    queryFn: () => api.get<{ items: Safehouse[] }>('/api/safehouses?pageSize=100'),
  });
  const safehouses = safehousesData?.items ?? [];

  const createMutation = useMutation({
    mutationFn: (body: AllocationFormData) =>
      api.post('/api/donation-allocations', {
        allocationId: 0,
        donationId: body.donationId,
        safehouseId: body.safehouseId,
        programArea: body.programArea,
        amountAllocated: body.amountAllocated,
        allocationDate: body.allocationDate,
        allocationNotes: body.allocationNotes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donation-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['donation-allocations-summary'] });
      queryClient.invalidateQueries({ queryKey: ['unallocated-donations'] });
      setAddOpen(false);
    },
  });

  const processed = useMemo(() => {
    let items = data?.items ?? [];
    if (programFilter) items = items.filter((r) => r.programArea === programFilter);
    if (search.trim()) {
      items = items.filter((r) =>
        smartMatch(search, [
          r.donationId,
          r.safehouseId,
          safehouses.find((s) => s.safehouseId === r.safehouseId)?.name ?? '',
          r.programArea,
          r.amountAllocated,
          r.allocationDate,
          r.allocationNotes,
        ]),
      );
    }
    return [...items].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'date') cmp = a.allocationDate.localeCompare(b.allocationDate);
      else if (sortKey === 'amount') cmp = a.amountAllocated - b.amountAllocated;
      else if (sortKey === 'program') cmp = a.programArea.localeCompare(b.programArea);
      else if (sortKey === 'safehouse') cmp = a.safehouseId - b.safehouseId;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, search, programFilter, sortKey, sortDir, safehouses]);

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  };

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  }

  function SortBtn({ col }: { col: SortKey }) {
    return (
      <button
        className={`ml-1 inline-flex items-center hover:opacity-100 ${sortKey === col ? 'text-golden-honey opacity-100' : 'opacity-50'}`}
        onClick={() => toggleSort(col)}
        type="button"
      >
        <ArrowUpDown size={13} />
      </button>
    );
  }

  const unallocated = Math.max(0, summary?.unallocated ?? 0);

  const columns = [
    {
      key: 'donationId',
      header: <span className="flex items-center">Donation <SortBtn col="date" /></span>,
      render: (row: Record<string, unknown>) => `#${row.donationId}`,
    },
    {
      key: 'safehouseId',
      header: <span className="flex items-center">Safehouse <SortBtn col="safehouse" /></span>,
      render: (row: Record<string, unknown>) => {
        const sh = safehouses.find((s) => s.safehouseId === row.safehouseId);
        return sh ? sh.name.replace(/^Lighthouse\s+/i, '') : `#${row.safehouseId}`;
      },
    },
    {
      key: 'programArea',
      header: <span className="flex items-center">Program Area <SortBtn col="program" /></span>,
    },
    {
      key: 'amountAllocated',
      header: <span className="flex items-center">Amount <SortBtn col="amount" /></span>,
      render: (row: Record<string, unknown>) => `PHP ${Number(row.amountAllocated).toLocaleString()}`,
    },
    {
      key: 'allocationDate',
      header: <span className="flex items-center">Date <SortBtn col="date" /></span>,
      render: (row: Record<string, unknown>) => formatDate(row.allocationDate as string),
    },
    {
      key: 'allocationNotes',
      header: 'Notes',
      render: (row: Record<string, unknown>) => {
        const notes = row.allocationNotes as string | null;
        if (!notes) return '--';
        return notes.length > 50 ? notes.slice(0, 50) + '...' : notes;
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Donation Allocations"
        subtitle={isAdmin
          ? 'How donations are distributed across safehouses and programs'
          : 'See how your donations are being allocated to safehouses and programs'
        }
      />

      {/* Funds still to allocate */}
      {isAdmin && (
        <Card className="mb-6 flex items-center justify-between border-golden-honey/40 bg-golden-honey/5 dark:border-golden-honey/30 dark:bg-golden-honey/5">
          <div>
            <p className="text-sm font-semibold text-slate-navy dark:text-white">
              Funds Still to Allocate
            </p>
            <p className="text-2xl font-bold text-golden-honey">PHP {unallocated.toLocaleString()}</p>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={14} />
            Allocate
          </Button>
        </Card>
      )}

      <Card>
        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray dark:text-white/40" />
            <input
              className="w-full rounded-lg border border-slate-navy/20 bg-white py-2 pl-9 pr-3 text-sm text-slate-navy placeholder:text-warm-gray/60 focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-dark-surface dark:text-white"
              placeholder="Search any field (e.g. Education, #42)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="rounded-lg border border-slate-navy/20 bg-white px-3 py-2 text-sm text-slate-navy focus:border-golden-honey focus:outline-none dark:border-white/20 dark:bg-dark-surface dark:text-white"
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
          >
            <option value="">All Program Areas</option>
            {programAreas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <Table
          columns={columns as Parameters<typeof Table>[0]['columns']}
          data={processed as unknown as Record<string, unknown>[]}
          loading={isLoading}
          emptyMessage="No allocations found."
          page={page}
          pageSize={pageSize}
          totalPages={data?.totalPages ?? 1}
          totalCount={data?.totalCount ?? 0}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={getPageSizeOptions(data?.totalCount)}
        />
      </Card>

      {isAdmin && (
        <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="New Allocation" size="lg" hideFooter>
          {createMutation.isError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {(createMutation.error as Error).message}
            </div>
          )}
          <AllocationForm
            safehouses={safehouses}
            onSubmit={(d) => createMutation.mutate(d)}
            onCancel={() => setAddOpen(false)}
            isSubmitting={createMutation.isPending}
          />
        </Modal>
      )}
    </div>
  );
}
