import { useEffect, useMemo, useState } from 'react';
import { NavigationBar } from '@/components/NavigationBar';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, handleApiError } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const Admin = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!loading) {
      if (!user) navigate('/auth');
      else if (!user.isAdmin) navigate('/');
    }
  }, [user, loading, navigate]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-users', q],
    queryFn: async () => {
      const res = await apiClient.adminListUsers({ q: q.trim() || undefined, limit: 100 });
      return res.users as Array<{
        id: string;
        email: string;
        is_admin: number | boolean;
        is_active: number | boolean;
        deleted_at: string | null;
        username?: string;
        full_name?: string;
      }>;
    },
    enabled: !!user?.isAdmin,
  });

  const deactivate = useMutation({
    mutationFn: async (id: string) => apiClient.adminDeactivateUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });
  const reactivate = useMutation({
    mutationFn: async (id: string) => apiClient.adminReactivateUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });
  const softDelete = useMutation({
    mutationFn: async ({ id, email }: { id: string; email: string }) =>
      apiClient.adminSoftDeleteUser(id, `DELETE USER ${email}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const users = data || [];
  const filtered = useMemo(() => users, [users]);

  return (
    <div className="min-h-screen bg-muted/30">
      <NavigationBar />

      <main className="max-w-6xl mx-auto pt-20 pb-6 px-4">
        <div className="mb-4 flex items-center gap-2">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>

        <div className="bg-card rounded-lg border p-4 mb-4">
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Search by email, username, full name"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') refetch(); }}
            />
            <Button onClick={() => refetch()}>Search</Button>
          </div>
        </div>

        <div className="bg-card rounded-lg border overflow-hidden">
          <div className="grid grid-cols-12 gap-2 p-3 bg-muted/50 text-sm font-medium">
            <div className="col-span-3">User</div>
            <div className="col-span-3">Email</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-4">Actions</div>
          </div>

          {isLoading ? (
            <div className="p-6 text-muted-foreground">Loading users...</div>
          ) : error ? (
            <div className="p-6 text-destructive">{handleApiError(error)}</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-muted-foreground">No users found</div>
          ) : (
            <div className="divide-y">
              {filtered.map((u) => {
                const active = !!u.is_active && !u.deleted_at;
                const isAdmin = !!u.is_admin;
                return (
                  <div key={u.id} className="grid grid-cols-12 gap-2 p-3 items-center text-sm">
                    <div className="col-span-3 truncate">{u.full_name || u.username || '—'}</div>
                    <div className="col-span-3 truncate">{u.email}</div>
                    <div className="col-span-2">
                      {isAdmin ? (
                        <span className="px-2 py-1 rounded bg-primary/10 text-primary">Admin</span>
                      ) : active ? (
                        <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700">Active</span>
                      ) : (
                        <span className="px-2 py-1 rounded bg-amber-100 text-amber-700">Inactive</span>
                      )}
                    </div>
                    <div className="col-span-4 flex gap-2">
                      {!isAdmin && active && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => deactivate.mutate(u.id)}
                          disabled={deactivate.isPending}
                        >
                          Deactivate
                        </Button>
                      )}
                      {!isAdmin && !active && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => reactivate.mutate(u.id)}
                          disabled={reactivate.isPending}
                        >
                          Reactivate
                        </Button>
                      )}
                      {!isAdmin && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => softDelete.mutate({ id: u.id, email: u.email })}
                          disabled={softDelete.isPending}
                        >
                          Soft delete
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Admin;
