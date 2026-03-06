import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { LogsResponse } from '@/types/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-success/20 text-success',
  POST: 'bg-primary/20 text-primary',
  PUT: 'bg-warning/20 text-warning',
  DELETE: 'bg-destructive/20 text-destructive',
};

export default function LogsPage() {
  const user = useAuthStore((s) => s.user);
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1', 10);
  const [filterTerm, setFilterTerm] = useState('');
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<LogsResponse>({
    queryKey: ['logs', user?.id, page],
    queryFn: async () => {
      const res = await api.get('/api/info-logs', {
        params: {
          'populate': 'user',
          'sort': 'searchedAt:desc',
          'pagination[page]': page,
          'pagination[pageSize]': 25,
          'filters[user][id][$eq]': user?.id,
        },
      });
      return res.data;
    },
    enabled: !!user?.id,
  });

  const logs = data?.data ?? [];
  const filtered = filterTerm
    ? logs.filter((l) => {
        const q = l.searchFilters?.q || '';
        return q.toLowerCase().includes(filterTerm.toLowerCase());
      })
    : logs;

  const totalPages = data?.meta?.pagination?.pageCount ?? 1;

  const goToPage = (p: number) => setSearchParams({ page: String(p) });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Mis Consultas Recientes</h1>

      <div className="flex gap-2">
        <Input
          placeholder="Filtrar por término buscado..."
          value={filterTerm}
          onChange={(e) => setFilterTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <ClipboardList className="h-12 w-12 mb-3 opacity-30" />
          <p>No tienes consultas registradas aún.</p>
        </div>
      )}

      {/* Desktop table */}
      {filtered.length > 0 && (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-left">
                  <th className="py-3 px-3 font-medium">#</th>
                  <th className="py-3 px-3 font-medium">Fecha y Hora</th>
                  <th className="py-3 px-3 font-medium">Término buscado</th>
                  <th className="py-3 px-3 font-medium">Ruta</th>
                  <th className="py-3 px-3 font-medium">Método</th>
                  <th className="py-3 px-3 font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, idx) => {
                  const term = log.searchFilters?.q || '—';
                  const dateStr = log.searchedAt
                    ? format(parseISO(log.searchedAt), "dd MMM yyyy, HH:mm", { locale: es })
                    : '—';
                  return (
                    <tr key={log.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-3 text-muted-foreground">{(page - 1) * 25 + idx + 1}</td>
                      <td className="py-3 px-3">{dateStr}</td>
                      <td className="py-3 px-3 font-medium">{term}</td>
                      <td className="py-3 px-3 text-muted-foreground font-mono text-xs">{log.requestPath || '—'}</td>
                      <td className="py-3 px-3">
                        <Badge className={`${METHOD_COLORS[log.requestMethod] || 'bg-muted text-muted-foreground'} border-0 text-xs`}>
                          {log.requestMethod}
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        {term !== '—' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/search?q=${encodeURIComponent(term)}&page=1`)}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" /> Repetir
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((log) => {
              const term = log.searchFilters?.q || '—';
              const dateStr = log.searchedAt
                ? format(parseISO(log.searchedAt), "dd MMM yyyy, HH:mm", { locale: es })
                : '—';
              return (
                <div key={log.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="font-medium">{term}</span>
                    <Badge className={`${METHOD_COLORS[log.requestMethod] || ''} border-0 text-xs`}>
                      {log.requestMethod}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{dateStr}</p>
                  <p className="text-xs text-muted-foreground font-mono">{log.requestPath}</p>
                  {term !== '—' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => navigate(`/search?q=${encodeURIComponent(term)}&page=1`)}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" /> Repetir búsqueda
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-1 pt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
                Anterior
              </Button>
              <span className="flex items-center px-3 text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
