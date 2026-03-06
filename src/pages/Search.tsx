import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { SearchResponse, InfoRecord } from '@/types/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search as SearchIcon, Cake, Mail, Phone, MapPin } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

function formatFullName(r: InfoRecord) {
  return [r.PRIMER_NOMBRE, r.SEGUNDO_NOMBRE, r.TERCER_NOMBRE, r.PRIMER_APELLIDO, r.SEGUNDO_APELLIDO]
    .filter(Boolean)
    .join(' ');
}

function formatDate(d: string | null) {
  if (!d) return '—';
  try {
    return format(parseISO(d), "dd 'de' MMMM 'de' yyyy", { locale: es });
  } catch {
    return d;
  }
}

const WS_FIELDS = [
  { key: 'WS_MIDES', label: 'MIDES' },
  { key: 'WS_MAGA', label: 'MAGA' },
  { key: 'WS_MSPAS', label: 'MSPAS' },
  { key: 'WS_MINECO', label: 'MINECO' },
] as const;

function ResultCard({ record }: { record: InfoRecord }) {
  const residence = [record.MUNIC_RESIDENCIA, record.DEPTO_RESIDENCIA].filter(Boolean).join(', ') || '—';

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-lg hover:shadow-[var(--shadow-card-hover)] hover:border-muted-foreground/30 transition-all duration-200">
      <div className="mb-3">
        <h3 className="font-bold text-base">{formatFullName(record) || '—'}</h3>
        <Badge variant="secondary" className="mt-1 font-mono text-xs">{record.CUI || '—'}</Badge>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Cake className="h-4 w-4 shrink-0" />
          <span className="text-foreground">{formatDate(record.FECHA_NACIMIENTO)}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Mail className="h-4 w-4 shrink-0" />
          <span className="text-foreground">{record.CORREO_ELECTRONICO || '—'}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="h-4 w-4 shrink-0" />
          <span className="text-foreground">{record.TELEFONO || '—'}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="text-foreground">{residence}</span>
        </div>
      </div>
      <div className="flex gap-3 mt-4 pt-3 border-t border-border">
        {WS_FIELDS.map((ws) => (
          <div key={ws.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className={`h-2 w-2 rounded-full ${record[ws.key] != null ? 'bg-success' : 'bg-muted-foreground/30'}`} />
            {ws.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  const urlPage = parseInt(searchParams.get('page') || '1', 10);
  const [inputValue, setInputValue] = useState(urlQuery);

  useEffect(() => {
    setInputValue(urlQuery);
  }, [urlQuery]);

  const { data, isLoading, isFetching } = useQuery<SearchResponse>({
    queryKey: ['search', urlQuery, urlPage],
    queryFn: async () => {
      const res = await api.get('/api/infos/search', {
        params: { q: urlQuery, limit: 20, page: urlPage },
      });
      return res.data;
    },
    enabled: !!urlQuery,
    staleTime: 30_000,
  });

  const doSearch = () => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      setSearchParams({ q: trimmed, page: '1' });
    }
  };

  const goToPage = (p: number) => {
    setSearchParams({ q: urlQuery, page: String(p) });
  };

  const totalCount = data?.meta?.pagination?.count ?? 0;
  const pageSize = data?.meta?.pagination?.pageSize ?? 20;
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
            placeholder="Buscar por nombre o CUI..."
            className="pl-10 h-11"
          />
        </div>
        <Button onClick={doSearch} className="h-11 px-6" disabled={isFetching}>
          Buscar
        </Button>
      </div>

      {/* Empty state */}
      {!urlQuery && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <SearchIcon className="h-16 w-16 mb-4 opacity-30" />
          <p className="text-lg">Ingresa un nombre o CUI para buscar</p>
        </div>
      )}

      {/* Loading */}
      {urlQuery && isLoading && <SkeletonCards />}

      {/* No results */}
      {urlQuery && !isLoading && data && data.data.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p>No se encontraron resultados para "<span className="text-foreground font-medium">{urlQuery}</span>"</p>
        </div>
      )}

      {/* Results grid */}
      {data && data.data.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.data.map((record) => (
              <ResultCard key={record.id} record={record} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {data.data.length} resultados — Página {urlPage}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => goToPage(urlPage - 1)} disabled={urlPage <= 1}>
                  Anterior
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (urlPage <= 3) {
                    pageNum = i + 1;
                  } else if (urlPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = urlPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === urlPage ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => goToPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button variant="outline" size="sm" onClick={() => goToPage(urlPage + 1)} disabled={urlPage >= totalPages}>
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
