import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, ChevronRight } from 'lucide-react';
import { UserLogsDialog } from '@/components/admin/UserLogsDialog';

interface Company {
  id: number;
  name: string;
  cost: number;
}

interface UserStat {
  id: number;
  username: string;
  email: string;
  count: number;
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const YEAR = new Date().getFullYear();

const fmt = (n: number) => n.toLocaleString('es-GT');
const fmtUSD = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function MyCompanyPage() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role?.type === 'super_admin';

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<{ id: number; username: string } | null>(null);

  const dateFrom = useMemo(() => startOfMonth(new Date(YEAR, month)), [month]);
  const dateTo = useMemo(() => endOfMonth(new Date(YEAR, month)), [month]);
  const fromISO = dateFrom.toISOString();
  const toISO = dateTo.toISOString();

  // Fetch all companies (super_admin only for selector)
  const { data: companies = [] } = useQuery({
    queryKey: ['my-company-list'],
    queryFn: async () => {
      const r = await api.get('/api/companies', {
        params: { sort: 'name:asc', 'pagination[pageSize]': 100 },
      });
      return r.data.data as Company[];
    },
    enabled: isSuperAdmin,
  });

  // Fetch current user's own company id
  const { data: myCompany } = useQuery({
    queryKey: ['my-company-me'],
    queryFn: async () => {
      const r = await api.get('/api/users/me', {
        params: { 'populate[0]': 'role', 'populate[1]': 'company' },
      });
      return r.data.company as Company | null;
    },
    enabled: !isSuperAdmin,
  });

  const companyId = isSuperAdmin
    ? (selectedCompanyId ?? companies[0]?.id ?? null)
    : (myCompany?.id ?? null);

  const activeCompany = isSuperAdmin
    ? companies.find((c) => c.id === companyId) ?? companies[0]
    : myCompany;

  // Total queries for selected company in month
  const { data: totalQ = 0, isLoading: qLoading } = useQuery({
    queryKey: ['my-company-total', companyId, fromISO, toISO],
    queryFn: async () => {
      const r = await api.get('/api/info-logs', {
        params: {
          'filters[user][company][id][$eq]': companyId,
          'filters[searchedAt][$gte]': fromISO,
          'filters[searchedAt][$lte]': toISO,
          'pagination[pageSize]': 1,
          'pagination[withCount]': true,
        },
      });
      return (r.data.meta?.pagination?.total as number) ?? 0;
    },
    enabled: companyId != null,
  });

  // Chart data — queries per day
  const { data: chartData = [], isLoading: chartLoading } = useQuery({
    queryKey: ['my-company-chart', companyId, fromISO, toISO],
    queryFn: async () => {
      const r = await api.get('/api/info-logs', {
        params: {
          'fields[0]': 'searchedAt',
          'filters[user][company][id][$eq]': companyId,
          'filters[searchedAt][$gte]': fromISO,
          'filters[searchedAt][$lte]': toISO,
          'pagination[pageSize]': 1000,
        },
      });
      const grouped: Record<string, number> = {};
      (r.data.data as { searchedAt: string }[]).forEach((l) => {
        const k = format(parseISO(l.searchedAt), 'yyyy-MM-dd');
        grouped[k] = (grouped[k] || 0) + 1;
      });
      return eachDayOfInterval({ start: dateFrom, end: dateTo }).map((d) => ({
        date: format(d, 'dd/MM'),
        consultas: grouped[format(d, 'yyyy-MM-dd')] || 0,
      }));
    },
    enabled: companyId != null,
  });

  // Users in company
  const { data: usersInCompany = [], isLoading: usersLoading } = useQuery({
    queryKey: ['my-company-users', companyId],
    queryFn: async () => {
      const r = await api.get('/api/users', {
        params: { 'filters[company][id][$eq]': companyId, 'populate': 'role' },
      });
      return r.data as { id: number; username: string; email: string }[];
    },
    enabled: companyId != null,
  });

  // Per-user query counts
  const { data: userStats = [], isLoading: userStatsLoading } = useQuery({
    queryKey: ['my-company-user-stats', companyId, fromISO, toISO, usersInCompany.map((u) => u.id).join(',')],
    queryFn: () =>
      Promise.all(
        usersInCompany.map(async (u) => {
          const r = await api.get('/api/info-logs', {
            params: {
              'filters[user][id][$eq]': u.id,
              'filters[searchedAt][$gte]': fromISO,
              'filters[searchedAt][$lte]': toISO,
              'pagination[pageSize]': 1,
              'pagination[withCount]': true,
            },
          });
          return {
            ...u,
            count: (r.data.meta?.pagination?.total as number) ?? 0,
          } as UserStat;
        }),
      ).then((r) => r.sort((a, b) => b.count - a.count)),
    enabled: usersInCompany.length > 0,
  });

  const activeUsers = userStats.filter((u) => u.count > 0).length;
  const estimatedCost = activeCompany ? totalQ * activeCompany.cost : 0;
  const loading = qLoading || chartLoading;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
          <Building2 className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard Mi Empresa</h1>
          <p className="text-sm text-slate-400">Estadísticas de consumo por empresa</p>
        </div>
      </div>

      {/* Company selector (super_admin only) */}
      {isSuperAdmin && companies.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Empresa
          </p>
          <Select
            value={String(companyId ?? companies[0]?.id)}
            onValueChange={(v) => setSelectedCompanyId(Number(v))}
          >
            <SelectTrigger className="w-72 bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder="Seleccionar empresa" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {companies.map((c) => (
                <SelectItem key={c.id} value={String(c.id)} className="text-white focus:bg-slate-700">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Month selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Período — {YEAR}
        </p>
        <div className="flex flex-wrap gap-2">
          {MONTHS.map((m, i) => (
            <button
              key={i}
              onClick={() => setMonth(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                month === i
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Total Consultas" value={fmt(totalQ)} sub={`${MONTHS[month]} ${YEAR}`} color="blue" loading={loading} />
        <KpiCard label="Costo Estimado" value={fmtUSD(estimatedCost)} color="green" loading={loading} />
        <KpiCard label="Usuarios Activos" value={fmt(activeUsers)} sub="con al menos 1 consulta" color="purple" loading={usersLoading || userStatsLoading} />
      </div>

      {/* Line chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">
          Consultas por día — {MONTHS[month]} {YEAR}
        </h2>
        {chartLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ left: -20, right: 0, top: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                cursor={{ stroke: 'rgba(168,85,247,0.3)' }}
              />
              <Line
                type="monotone"
                dataKey="consultas"
                stroke="#a855f7"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#a855f7' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* User stats table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-slate-300">Consultas por Usuario</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px]">
            <thead>
              <tr className="border-b border-slate-800">
                {['Usuario', 'Email', 'Consultas'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider ${
                      i === 2 ? 'text-right' : 'text-left'
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usersLoading || userStatsLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-800/50">
                      <td className="px-5 py-3"><Skeleton className="h-4 w-28" /></td>
                      <td className="px-5 py-3"><Skeleton className="h-4 w-40" /></td>
                      <td className="px-5 py-3 text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
                    </tr>
                  ))
                : userStats.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => setSelectedUser({ id: u.id, username: u.username })}
                      className="border-b border-slate-800/40 hover:bg-slate-800/30 cursor-pointer transition-colors group"
                    >
                      <td className="px-5 py-3 text-sm text-white font-medium group-hover:text-indigo-300 transition-colors">{u.username}</td>
                      <td className="px-5 py-3 text-sm text-slate-400">{u.email}</td>
                      <td className="px-5 py-3 text-sm text-blue-400 text-right tabular-nums">{fmt(u.count)}</td>
                      <td className="px-3 py-3 text-right">
                        <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 transition-colors ml-auto" />
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        {!usersLoading && !userStatsLoading && userStats.length === 0 && (
          <p className="px-5 py-10 text-center text-slate-500 text-sm">Sin usuarios registrados</p>
        )}
      </div>

      <UserLogsDialog
        userId={selectedUser?.id ?? null}
        username={selectedUser?.username ?? ''}
        fromISO={fromISO}
        toISO={toISO}
        open={selectedUser != null}
        onClose={() => setSelectedUser(null)}
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  color,
  loading,
}: {
  label: string;
  value: string;
  sub?: string;
  color: 'blue' | 'green' | 'purple';
  loading: boolean;
}) {
  const cls = { blue: 'text-blue-400', green: 'text-emerald-400', purple: 'text-purple-400' }[color];
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      {loading ? (
        <Skeleton className="h-8 w-24 mt-1" />
      ) : (
        <p className={`text-2xl font-bold tabular-nums mt-1 ${cls}`}>{value}</p>
      )}
      {sub && <p className="text-xs text-slate-600 mt-1">{sub}</p>}
    </div>
  );
}
