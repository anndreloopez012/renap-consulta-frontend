import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings2, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Company {
  id: number;
  name: string;
  cost: number;
  publishedAt?: string | null;
}

interface AppUser {
  id: number;
  username: string;
  email: string;
  confirmed: boolean;
  blocked: boolean;
  role?: { id: number; name: string; type: string };
  company?: Company | null;
}

interface Role {
  id: number;
  name: string;
  type: string;
}

// ─── Companies Tab ──────────────────────────────────────────────────────────

function CompaniesTab() {
  const qc = useQueryClient();
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['mgmt-companies'],
    queryFn: async () => {
      const r = await api.get('/api/companies', {
        params: { sort: 'name:asc', 'pagination[pageSize]': 100 },
      });
      return r.data.data as Company[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { id?: number; name: string; cost: number }) => {
      if (data.id) {
        await api.put(`/api/companies/${data.id}`, { data: { name: data.name, cost: data.cost } });
      } else {
        await api.post('/api/companies', { data: { name: data.name, cost: data.cost } });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mgmt-companies'] });
      setEditCompany(null);
      setShowCreate(false);
      toast.success('Empresa guardada');
    },
    onError: () => toast.error('Error al guardar empresa'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/companies/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mgmt-companies'] });
      setDeleteTarget(null);
      toast.success('Empresa eliminada');
    },
    onError: () => toast.error('Error al eliminar empresa'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{companies.length} empresa(s) registrada(s)</p>
        <Button size="sm" className="gap-2" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5" /> Nueva Empresa
        </Button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full min-w-[400px]">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Nombre</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Costo/Q</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Estado</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-800/50">
                    <td className="px-5 py-3"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-5 py-3 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                    <td className="px-5 py-3 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                    <td className="px-5 py-3"><Skeleton className="h-4 w-16 ml-auto" /></td>
                  </tr>
                ))
              : companies.map((c) => (
                  <tr key={c.id} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                    <td className="px-5 py-3 text-sm text-white font-medium">{c.name}</td>
                    <td className="px-5 py-3 text-sm text-slate-400 text-right tabular-nums">
                      ${Number(c.cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.publishedAt ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                        {c.publishedAt ? 'Activa' : 'Borrador'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditCompany(c)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(c)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        {!isLoading && companies.length === 0 && (
          <p className="px-5 py-10 text-center text-slate-500 text-sm">Sin empresas registradas</p>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <CompanyDialog
        open={showCreate || editCompany != null}
        initial={editCompany}
        loading={saveMutation.isPending}
        onSave={(name, cost) => saveMutation.mutate({ id: editCompany?.id, name, cost })}
        onClose={() => { setShowCreate(false); setEditCompany(null); }}
      />

      {/* Delete confirmation */}
      <AlertDialog open={deleteTarget != null} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Eliminar empresa</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              ¿Eliminar <span className="font-semibold text-white">{deleteTarget?.name}</span>? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CompanyDialog({
  open,
  initial,
  loading,
  onSave,
  onClose,
}: {
  open: boolean;
  initial: Company | null;
  loading: boolean;
  onSave: (name: string, cost: number) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [cost, setCost] = useState(String(initial?.cost ?? ''));

  // Reset when opening
  useState(() => { setName(initial?.name ?? ''); setCost(String(initial?.cost ?? '')); });

  const handleSave = () => {
    const c = parseFloat(cost);
    if (!name.trim() || isNaN(c) || c < 0) return;
    onSave(name.trim(), c);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">{initial ? 'Editar Empresa' : 'Nueva Empresa'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-slate-300">Nombre</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre de la empresa"
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              defaultValue={initial?.name}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300">Costo por consulta (USD)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0.00"
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              defaultValue={initial?.cost}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-slate-300">Cancelar</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Users Tab ───────────────────────────────────────────────────────────────

function UsersTab() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['mgmt-users'],
    queryFn: async () => {
      const r = await api.get('/api/users', {
        params: { 'populate[0]': 'role', 'populate[1]': 'company' },
      });
      return r.data as AppUser[];
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['mgmt-companies'],
    queryFn: async () => {
      const r = await api.get('/api/companies', {
        params: { sort: 'name:asc', 'pagination[pageSize]': 100 },
      });
      return r.data.data as Company[];
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['mgmt-roles'],
    queryFn: async () => {
      const r = await api.get('/api/users-permissions/roles');
      return r.data.roles as Role[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      username: string;
      email: string;
      password: string;
      roleId: number;
      companyId: number | null;
    }) => {
      // Step 1: register user
      const reg = await api.post('/api/auth/local/register', {
        username: data.username,
        email: data.email,
        password: data.password,
      });
      const newUserId = reg.data.user?.id;
      if (!newUserId) throw new Error('No user id returned');
      // Step 2: assign role and company
      await api.put(`/api/users/${newUserId}`, {
        role: data.roleId,
        company: data.companyId,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mgmt-users'] });
      setShowCreate(false);
      toast.success('Usuario creado');
    },
    onError: () => toast.error('Error al crear usuario'),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; roleId: number; companyId: number | null }) => {
      await api.put(`/api/users/${data.id}`, {
        role: data.roleId,
        company: data.companyId,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mgmt-users'] });
      setEditUser(null);
      toast.success('Usuario actualizado');
    },
    onError: () => toast.error('Error al actualizar usuario'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/users/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mgmt-users'] });
      setDeleteTarget(null);
      toast.success('Usuario eliminado');
    },
    onError: () => toast.error('Error al eliminar usuario'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{users.length} usuario(s) registrado(s)</p>
        <Button size="sm" className="gap-2" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5" /> Nuevo Usuario
        </Button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-slate-800">
                {['Usuario', 'Email', 'Empresa', 'Rol', ''].map((h, i) => (
                  <th
                    key={i}
                    className={`px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider ${i === 4 ? '' : 'text-left'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usersLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-800/50">
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j} className="px-5 py-3"><Skeleton className="h-4 w-24" /></td>
                      ))}
                    </tr>
                  ))
                : users.map((u) => (
                    <tr key={u.id} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                      <td className="px-5 py-3 text-sm text-white font-medium">{u.username}</td>
                      <td className="px-5 py-3 text-sm text-slate-400">{u.email}</td>
                      <td className="px-5 py-3 text-sm text-slate-400">
                        {u.company?.name ?? <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400">
                          {u.role?.name ?? '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditUser(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        {!usersLoading && users.length === 0 && (
          <p className="px-5 py-10 text-center text-slate-500 text-sm">Sin usuarios registrados</p>
        )}
      </div>

      {/* Create user dialog */}
      <CreateUserDialog
        open={showCreate}
        companies={companies}
        roles={roles}
        loading={createMutation.isPending}
        onSave={(d) => createMutation.mutate(d)}
        onClose={() => setShowCreate(false)}
      />

      {/* Edit user dialog */}
      <EditUserDialog
        open={editUser != null}
        user={editUser}
        companies={companies}
        roles={roles}
        loading={updateMutation.isPending}
        onSave={(roleId, companyId) => editUser && updateMutation.mutate({ id: editUser.id, roleId, companyId })}
        onClose={() => setEditUser(null)}
      />

      {/* Delete confirmation */}
      <AlertDialog open={deleteTarget != null} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Eliminar usuario</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              ¿Eliminar a <span className="font-semibold text-white">{deleteTarget?.username}</span>? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CreateUserDialog({
  open,
  companies,
  roles,
  loading,
  onSave,
  onClose,
}: {
  open: boolean;
  companies: Company[];
  roles: Role[];
  loading: boolean;
  onSave: (d: { username: string; email: string; password: string; roleId: number; companyId: number | null }) => void;
  onClose: () => void;
}) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState<string>('');
  const [companyId, setCompanyId] = useState<string>('none');

  const handleSave = () => {
    if (!username.trim() || !email.trim() || !password || !roleId) return;
    onSave({
      username: username.trim(),
      email: email.trim(),
      password,
      roleId: Number(roleId),
      companyId: companyId !== 'none' ? Number(companyId) : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Nuevo Usuario</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-slate-300">Usuario</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="nombre_usuario" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300">Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@empresa.com" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300">Contraseña</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300">Rol</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {roles.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)} className="text-white focus:bg-slate-700">{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300">Empresa</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Sin empresa" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="none" className="text-slate-400 focus:bg-slate-700">Sin empresa</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)} className="text-white focus:bg-slate-700">{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-slate-300">Cancelar</Button>
          <Button onClick={handleSave} disabled={loading}>{loading ? 'Creando…' : 'Crear usuario'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({
  open,
  user,
  companies,
  roles,
  loading,
  onSave,
  onClose,
}: {
  open: boolean;
  user: AppUser | null;
  companies: Company[];
  roles: Role[];
  loading: boolean;
  onSave: (roleId: number, companyId: number | null) => void;
  onClose: () => void;
}) {
  const [roleId, setRoleId] = useState(String(user?.role?.id ?? ''));
  const [companyId, setCompanyId] = useState(user?.company ? String(user.company.id) : 'none');

  const handleSave = () => {
    if (!roleId) return;
    onSave(Number(roleId), companyId !== 'none' ? Number(companyId) : null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Editar Usuario — {user?.username}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-slate-300">Rol</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {roles.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)} className="text-white focus:bg-slate-700">{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300">Empresa</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Sin empresa" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="none" className="text-slate-400 focus:bg-slate-700">Sin empresa</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)} className="text-white focus:bg-slate-700">{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-slate-300">Cancelar</Button>
          <Button onClick={handleSave} disabled={loading}>{loading ? 'Guardando…' : 'Guardar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ManagementPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
          <Settings2 className="h-5 w-5 text-rose-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Gestión</h1>
          <p className="text-sm text-slate-400">Administración de empresas y usuarios</p>
        </div>
      </div>

      <Tabs defaultValue="companies">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="companies" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400">
            Empresas
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400">
            Usuarios
          </TabsTrigger>
        </TabsList>
        <TabsContent value="companies" className="mt-4">
          <CompaniesTab />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <UsersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
