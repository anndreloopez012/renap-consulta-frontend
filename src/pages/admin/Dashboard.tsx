import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, LayoutDashboard } from 'lucide-react';

interface Company {
  id: number;
  name: string;
  cost: number;
  publishedAt?: string | null;
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const YEAR = new Date().getFullYear();

const fmt = (n: number) => n.toLocaleString('es-GT');
const fmtUSD = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DashboardPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());

  const dateFrom = useMemo(() => startOfMonth(new Date(YEAR, month)), [month]);
  const dateTo = useMemo(() => endOfMonth(new Date(YEAR, month)), [month]);
  const fromISO = dateFrom.toISOString();
  const toISO = dateTo.toISOString();

  const { data: companies = [], isLoading: cLoading } = useQuery({
    queryKey: ['admin-companies'],
    queryFn: async () => {
      const r = await api.get('/api/companies', {
        params: { sort: 'name:asc', 'pagination[pageSize]': 100 },
      });
      return r.data.data as Company[];
    },
  });

  const {
    data: stats = [],
    isLoading: sLoading,
    refetch,
  } = useQuery({
    queryKey: ['admin-stats', fromISO, toISO, companies.map((c) => c.id).join(',')],
    queryFn: () =>
      Promise.all(
        companies.map(async (company) => {
          const r = await api.get('/api/info-logs', {
            params: {
              'filters[user][company][id][$eq]': company.id,
              'filters[searchedAt][$gte]': fromISO,
              'filters[searchedAt][$lte]': toISO,
              'pagination[pageSize]': 1,
              'pagination[withCount]': true,
            },
          });
          return {
            company,
            count: ((r.data.meta?.pagination?.total as number) ?? 0),
          };
        }),
      ).then((r) => r.sort((a, b) => b.count - a.count)),
    enabled: companies.length > 0,
  });

  const { data: totalUsers = 0 } = useQuery({
    queryKey: ['admin-user-count'],
    queryFn: async () => {
      const r = await api.get('/api/users');
      return (r.data as unknown[]).length;
    },
  });

  const { data: chartData = [] } = useQuery({
    queryKey: ['admin-chart', fromISO, toISO],
    queryFn: async () => {
      const r = await api.get('/api/info-logs', {
        params: {
          'fields[0]': 'searchedAt',
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
  });

  const totalQ = useMemo(() => stats.reduce((s, c) => s + c.count, 0), [stats]);
  const totalRev = useMemo(
    () => stats.reduce((s, c) => s + c.count * c.company.cost, 0),
    [stats],
  );
  const loading = cLoading || sLoading;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <LayoutDashboard className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard Global</h1>
            <p className="text-sm text-slate-400">
              Estadísticas de consumo de todas las empresas
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="gap-2 border-slate-700"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Actualizar
        </Button>
      </div>

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
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Consultas"
          value={fmt(totalQ)}
          sub={`${MONTHS[month]} ${YEAR}`}
          color="blue"
          loading={loading}
        />
        <KpiCard
          label="Empresas"
          value={fmt(companies.length)}
          color="purple"
          loading={cLoading}
        />
        <KpiCard label="Usuarios" value={fmt(totalUsers)} color="indigo" loading={false} />
        <KpiCard
          label="Ingresos Est."
          value={fmtUSD(totalRev)}
          color="green"
          loading={loading}
        />
      </div>

      {/* Bar chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">
          Consultas por día — {MONTHS[month]} {YEAR}
        </h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ left: -20, right: 0, top: 4, bottom: 0 }}>
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
              cursor={{ fill: 'rgba(99,102,241,0.08)' }}
            />
            <Bar dataKey="consultas" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Company table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-slate-300">Consumo por Empresa</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-slate-800">
                {['Empresa', 'Costo/Q', 'Consultas', 'Costo'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider ${
                      i === 0 ? 'text-left' : 'text-right'
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-800/50">
                      <td className="px-5 py-3">
                        <Skeleton className="h-4 w-40" />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Skeleton className="h-4 w-14 ml-auto" />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Skeleton className="h-4 w-16 ml-auto" />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Skeleton className="h-4 w-16 ml-auto" />
                      </td>
                    </tr>
                  ))
                : stats.map(({ company, count }) => (
                    <tr
                      key={company.id}
                      className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors"
                    >
                      <td className="px-5 py-3 text-sm text-white font-medium">{company.name}</td>
                      <td className="px-5 py-3 text-sm text-slate-400 text-right">
                        {fmtUSD(company.cost)}
                      </td>
                      <td className="px-5 py-3 text-sm text-blue-400 text-right tabular-nums">
                        {fmt(count)}
                      </td>
                      <td className="px-5 py-3 text-sm text-emerald-400 text-right tabular-nums">
                        {fmtUSD(count * company.cost)}
                      </td>
                    </tr>
                  ))}
            </tbody>
            {!loading && stats.length > 1 && (
              <tfoot className="border-t-2 border-slate-700 bg-slate-800/20">
                <tr>
                  <td colSpan={2} className="px-5 py-3 text-sm font-semibold text-slate-300">
                    Total
                  </td>
                  <td className="px-5 py-3 text-sm font-bold text-blue-400 text-right tabular-nums">
                    {fmt(totalQ)}
                  </td>
                  <td className="px-5 py-3 text-sm font-bold text-emerald-400 text-right tabular-nums">
                    {fmtUSD(totalRev)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {!loading && stats.length === 0 && (
          <p className="px-5 py-10 text-center text-slate-500 text-sm">Sin datos para este período</p>
        )}
      </div>
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
  color: 'blue' | 'green' | 'purple' | 'indigo';
  loading: boolean;
}) {
  const cls = {
    blue: 'text-blue-400',
    green: 'text-emerald-400',
    purple: 'text-purple-400',
    indigo: 'text-indigo-400',
  }[color];
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
