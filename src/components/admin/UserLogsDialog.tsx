import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';

interface InfoLog {
  id: number;
  searchedAt: string;
  searchFilters: Record<string, string> | null;
}

const PAGE_SIZE = 25;

export function UserLogsDialog({
  userId,
  username,
  fromISO,
  toISO,
  open,
  onClose,
}: {
  userId: number | null;
  username: string;
  fromISO: string;
  toISO: string;
  open: boolean;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['user-logs-dialog', userId, fromISO, toISO, page],
    queryFn: async () => {
      const r = await api.get('/api/info-logs', {
        params: {
          'filters[user][id][$eq]': userId,
          'filters[searchedAt][$gte]': fromISO,
          'filters[searchedAt][$lte]': toISO,
          sort: 'searchedAt:desc',
          'pagination[page]': page,
          'pagination[pageSize]': PAGE_SIZE,
          'pagination[withCount]': true,
        },
      });
      return {
        logs: r.data.data as InfoLog[],
        total: (r.data.meta?.pagination?.total as number) ?? 0,
      };
    },
    enabled: open && userId != null,
  });

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  const fmt = (d: string) =>
    format(parseISO(d), "dd MMM yyyy, HH:mm", { locale: es });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) { setPage(1); onClose(); }
      }}
    >
      <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-2xl flex flex-col max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-slate-400" />
            Consultas de{' '}
            <span className="text-indigo-400">{username}</span>
          </DialogTitle>
          <p className="text-xs text-slate-500">
            {data?.total ?? 0} registros en el período seleccionado
          </p>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 -mx-6 px-6">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900 z-10">
              <tr className="border-b border-slate-800">
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-10">#</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha y Hora</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Término buscado</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-800/50">
                      <td className="px-3 py-2.5"><Skeleton className="h-3 w-6" /></td>
                      <td className="px-3 py-2.5"><Skeleton className="h-3 w-36" /></td>
                      <td className="px-3 py-2.5"><Skeleton className="h-3 w-28" /></td>
                    </tr>
                  ))
                : (data?.logs ?? []).map((log, i) => (
                    <tr
                      key={log.id}
                      className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors"
                    >
                      <td className="px-3 py-2.5 text-xs text-slate-600 font-mono">
                        {(page - 1) * PAGE_SIZE + i + 1}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-400">
                        {log.searchedAt ? fmt(log.searchedAt) : '—'}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-white">
                        {log.searchFilters?.q || '—'}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>

          {!isLoading && (data?.logs ?? []).length === 0 && (
            <p className="py-10 text-center text-slate-500 text-sm">
              Sin consultas en este período
            </p>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <span className="text-xs text-slate-500">
              Página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-slate-700 text-slate-300 h-7 px-2"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-slate-700 text-slate-300 h-7 px-2"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
