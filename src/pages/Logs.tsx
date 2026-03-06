import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { LogsResponse } from '@/types/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ClipboardList, RefreshCw, CalendarIcon, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

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

  // Date range filter — default to current month
  const now = new Date();
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(now));
  const [dateTo, setDateTo] = useState<Date>(endOfMonth(now));

  const { data, isLoading, refetch } = useQuery<LogsResponse>({
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

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      // Text filter
      const q = l.searchFilters?.q || '';
      if (filterTerm && !q.toLowerCase().includes(filterTerm.toLowerCase())) return false;

      // Date filter
      if (l.searchedAt) {
        const logDate = parseISO(l.searchedAt);
        if (!isWithinInterval(logDate, { start: dateFrom, end: dateTo })) return false;
      }
      return true;
    });
  }, [logs, filterTerm, dateFrom, dateTo]);

  const totalPages = data?.meta?.pagination?.pageCount ?? 1;
  const goToPage = (p: number) => setSearchParams({ page: String(p) });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mis Consultas Recientes</h1>
          <p className="text-sm text-muted-foreground mt-1">Historial de búsquedas realizadas</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 border-border/50">
          <RefreshCw className="h-3.5 w-3.5" /> Actualizar
        </Button>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-4 space-y-3 md:space-y-0 md:flex md:items-center md:gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Input
            placeholder="Filtrar por término buscado..."
            value={filterTerm}
            onChange={(e) => setFilterTerm(e.target.value)}
            className="pl-10 bg-background/50 border-border/50"
          />
        </div>

        {/* Date From */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-full md:w-44 justify-start text-left font-normal border-border/50 bg-background/50", !dateFrom && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground/50" />
              {dateFrom ? format(dateFrom, "dd MMM yyyy", { locale: es }) : "Desde"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 glass-strong border-border/50" align="start">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={(d) => d && setDateFrom(d)}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        {/* Date To */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-full md:w-44 justify-start text-left font-normal border-border/50 bg-background/50", !dateTo && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground/50" />
              {dateTo ? format(dateTo, "dd MMM yyyy", { locale: es }) : "Hasta"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 glass-strong border-border/50" align="start">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={(d) => d && setDateTo(d)}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </motion.div>

      {/* Quick month label */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CalendarIcon className="h-3.5 w-3.5" />
        Mostrando: {format(dateFrom, "dd MMM", { locale: es })} — {format(dateTo, "dd MMM yyyy", { locale: es })}
        {filtered.length > 0 && <Badge variant="secondary" className="ml-2 text-xs bg-primary/10 text-primary border-0">{filtered.length} registros</Badge>}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center py-20 text-muted-foreground"
        >
          <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
            <ClipboardList className="h-8 w-8 opacity-40" />
          </div>
          <p className="font-medium">No tienes consultas registradas</p>
          <p className="text-sm mt-1 text-muted-foreground/60">en el rango seleccionado</p>
        </motion.div>
      )}

      {/* Desktop table */}
      {filtered.length > 0 && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="hidden md:block overflow-x-auto glass rounded-xl"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 text-muted-foreground/70 text-left">
                  <th className="py-3.5 px-4 font-medium text-xs uppercase tracking-wider">#</th>
                  <th className="py-3.5 px-4 font-medium text-xs uppercase tracking-wider">Fecha y Hora</th>
                  <th className="py-3.5 px-4 font-medium text-xs uppercase tracking-wider">Término buscado</th>
                  <th className="py-3.5 px-4 font-medium text-xs uppercase tracking-wider">Ruta</th>
                  <th className="py-3.5 px-4 font-medium text-xs uppercase tracking-wider">Método</th>
                  <th className="py-3.5 px-4 font-medium text-xs uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, idx) => {
                  const term = log.searchFilters?.q || '—';
                  const dateStr = log.searchedAt
                    ? format(parseISO(log.searchedAt), "dd MMM yyyy, HH:mm", { locale: es })
                    : '—';
                  return (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="border-b border-border/20 hover:bg-primary/5 transition-colors group"
                    >
                      <td className="py-3.5 px-4 text-muted-foreground/60 font-mono text-xs">{(page - 1) * 25 + idx + 1}</td>
                      <td className="py-3.5 px-4 text-muted-foreground">{dateStr}</td>
                      <td className="py-3.5 px-4 font-semibold">{term}</td>
                      <td className="py-3.5 px-4 text-muted-foreground font-mono text-xs">{log.requestPath || '—'}</td>
                      <td className="py-3.5 px-4">
                        <Badge className={`${METHOD_COLORS[log.requestMethod] || 'bg-muted text-muted-foreground'} border-0 text-xs font-mono`}>
                          {log.requestMethod}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        {term !== '—' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => navigate(`/search?q=${encodeURIComponent(term)}&page=1`)}
                          >
                            <RefreshCw className="h-3 w-3 mr-1.5" /> Repetir
                          </Button>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((log, idx) => {
              const term = log.searchFilters?.q || '—';
              const dateStr = log.searchedAt
                ? format(parseISO(log.searchedAt), "dd MMM yyyy, HH:mm", { locale: es })
                : '—';
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="glass rounded-xl p-4 space-y-2.5 card-shine"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-semibold">{term}</span>
                    <Badge className={`${METHOD_COLORS[log.requestMethod] || ''} border-0 text-xs font-mono`}>
                      {log.requestMethod}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{dateStr}</p>
                  <p className="text-xs text-muted-foreground font-mono">{log.requestPath}</p>
                  {term !== '—' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-primary/30 text-primary hover:bg-primary/10"
                      onClick={() => navigate(`/search?q=${encodeURIComponent(term)}&page=1`)}
                    >
                      <RefreshCw className="h-3 w-3 mr-1.5" /> Repetir búsqueda
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goToPage(page - 1)} className="border-border/50">
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground bg-muted/20 rounded-lg">
                {page} / {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => goToPage(page + 1)} className="border-border/50">
                Siguiente <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
