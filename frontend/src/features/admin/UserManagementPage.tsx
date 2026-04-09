import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, ChevronDown } from 'lucide-react';
import { api } from '../../lib/api';
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

export function UserManagementPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ['users', page],
    queryFn: () => api.get(`/api/users?page=${page}&pageSize=20`),
  });

  const updateRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.put(`/api/users/${userId}/role`, { role }),
    onMutate: async ({ userId, role }) => {
      await queryClient.cancelQueries({ queryKey: ['users', page] });
      const previous = queryClient.getQueryData<UsersResponse>(['users', page]);
      queryClient.setQueryData<UsersResponse>(['users', page], (old) => {
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
        queryClient.setQueryData(['users', page], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['supporters'] });
    },
  });

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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-navy/10 dark:border-white/10">
                <th className="pb-3 font-semibold text-slate-navy dark:text-white">Name</th>
                <th className="pb-3 font-semibold text-slate-navy dark:text-white">Email</th>
                <th className="pb-3 font-semibold text-slate-navy dark:text-white">Role</th>
                <th className="pb-3 font-semibold text-slate-navy dark:text-white">2FA</th>
                <th className="pb-3 font-semibold text-slate-navy dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((user) => (
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

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-slate-navy/10 pt-4 dark:border-white/10">
            <p className="text-sm text-warm-gray">
              {data.totalCount} users total
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-slate-navy/20 px-3 py-1 text-sm disabled:opacity-50 dark:border-white/20 dark:text-white"
              >
                Previous
              </button>
              <span className="px-2 py-1 text-sm text-warm-gray">
                {page} / {data.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="rounded-lg border border-slate-navy/20 px-3 py-1 text-sm disabled:opacity-50 dark:border-white/20 dark:text-white"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
