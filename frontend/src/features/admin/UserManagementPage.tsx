import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, ChevronDown, Search, ArrowUpDown } from 'lucide-react';
import { api } from '../../lib/api';
import { smartMatch } from '../../lib/smartSearch';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { useAuthStore } from '../../stores/authStore';

interface UserItem {
  id: string;
  email: string;
  displayName: string;
  role: string;
  emailConfirmed: boolean;
  has2fa: boolean;
}

interface UsersResponse {
  items: UserItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const roleBadgeVariant: Record<string, 'danger' | 'info' | 'success'> = {
  Admin: 'danger',
  Staff: 'info',
  Donor: 'success',
};

type SortKey = 'name' | 'email' | 'role';

export function UserManagementPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [mfaFilter, setMfaFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ['users'],
    queryFn: () => api.get(`/api/users?page=1&pageSize=100`),
  });

  const updateRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.put(`/api/users/${userId}/role`, { role }),
    onMutate: async ({ userId, role }) => {
      await queryClient.cancelQueries({ queryKey: ['users'] });
      const previous = queryClient.getQueryData<UsersResponse>(['users']);
      queryClient.setQueryData<UsersResponse>(['users'], (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((u) => (u.id === userId ? { ...u, role } : u)),
        };
      });
      setEditingUserId(null);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['users'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['supporters'] });
    },
  });

  const processed = useMemo(() => {
    let items = data?.items ?? [];
    if (roleFilter) items = items.filter((u) => u.role === roleFilter);
    if (mfaFilter === 'on') items = items.filter((u) => u.has2fa);
    if (mfaFilter === 'off') items = items.filter((u) => !u.has2fa);
    if (search.trim()) {
      items = items.filter((u) =>
        smartMatch(search, [u.displayName, u.email, u.role]),
      );
    }
    return [...items].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.displayName.localeCompare(b.displayName);
      else if (sortKey === 'email') cmp = a.email.localeCompare(b.email);
      else if (sortKey === 'role') cmp = a.role.localeCompare(b.role);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, search, roleFilter, mfaFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
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

  if (isLoading) return <Spinner size="lg" />;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <ShieldCheck size={24} className="text-slate-navy dark:text-white" />
        <h1 className="font-heading text-2xl font-bold text-slate-navy dark:text-white">
          User Management
        </h1>
      </div>

      <Card>
        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray dark:text-white/40" />
            <input
              className="w-full rounded-lg border border-slate-navy/20 bg-white py-2 pl-9 pr-3 text-sm text-slate-navy placeholder:text-warm-gray/60 focus:border-golden-honey focus:outline-none focus:ring-2 focus:ring-golden-honey/40 dark:border-white/20 dark:bg-dark-surface dark:text-white"
              placeholder="Smart search (e.g. ti br.)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="rounded-lg border border-slate-navy/20 bg-white px-3 py-2 text-sm text-slate-navy focus:border-golden-honey focus:outline-none dark:border-white/20 dark:bg-dark-surface dark:text-white"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Staff">Staff</option>
            <option value="Donor">Donor</option>
          </select>
          <select
            className="rounded-lg border border-slate-navy/20 bg-white px-3 py-2 text-sm text-slate-navy focus:border-golden-honey focus:outline-none dark:border-white/20 dark:bg-dark-surface dark:text-white"
            value={mfaFilter}
            onChange={(e) => setMfaFilter(e.target.value)}
          >
            <option value="">All 2FA</option>
            <option value="on">2FA Enabled</option>
            <option value="off">2FA Off</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-navy/10 dark:border-white/10">
                <th className="pb-3 font-semibold text-slate-navy dark:text-white">
                  <span className="flex items-center">Name <SortBtn col="name" /></span>
                </th>
                <th className="pb-3 font-semibold text-slate-navy dark:text-white">
                  <span className="flex items-center">Email <SortBtn col="email" /></span>
                </th>
                <th className="pb-3 font-semibold text-slate-navy dark:text-white">
                  <span className="flex items-center">Role <SortBtn col="role" /></span>
                </th>
                <th className="pb-3 font-semibold text-slate-navy dark:text-white">2FA</th>
                <th className="pb-3 font-semibold text-slate-navy dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {processed.map((user) => (
                <tr key={user.id} className="border-b border-slate-navy/5 dark:border-white/5">
                  <td className="py-3 text-slate-navy dark:text-white">{user.displayName}</td>
                  <td className="py-3 text-warm-gray dark:text-white/60">{user.email}</td>
                  <td className="py-3">
                    {editingUserId === user.id ? (
                      <div className="relative inline-block">
                        <select
                          defaultValue={user.role}
                          onChange={(e) => updateRole.mutate({ userId: user.id, role: e.target.value })}
                          onBlur={() => setEditingUserId(null)}
                          autoFocus
                          className="appearance-none rounded-lg border border-slate-navy/20 bg-white py-1 pl-3 pr-8 text-sm dark:border-white/20 dark:bg-dark-surface dark:text-white"
                        >
                          <option value="Admin">Admin</option>
                          <option value="Staff">Staff</option>
                          <option value="Donor">Donor</option>
                        </select>
                        <ChevronDown size={14} className="pointer-events-none absolute right-2 top-2 text-warm-gray" />
                      </div>
                    ) : (
                      <Badge variant={roleBadgeVariant[user.role] ?? 'neutral'}>
                        {user.role}
                      </Badge>
                    )}
                  </td>
                  <td className="py-3">
                    <Badge variant={user.has2fa ? 'success' : 'neutral'}>
                      {user.has2fa ? 'Enabled' : 'Off'}
                    </Badge>
                  </td>
                  <td className="py-3">
                    {user.email !== currentUser?.email && (
                      <button
                        onClick={() => setEditingUserId(user.id)}
                        className="text-sm font-medium text-sky-blue-text hover:underline dark:text-sky-blue"
                      >
                        Change Role
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Results count */}
        <div className="mt-4 border-t border-slate-navy/10 pt-4 dark:border-white/10">
          <p className="text-sm text-warm-gray">
            Showing {processed.length} of {data?.totalCount ?? 0} users
          </p>
        </div>
      </Card>
    </div>
  );
}
