import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { SearchResponse, InfoRecord } from '@/types/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search as SearchIcon, Cake, Mail, Phone, MapPin, Database, Globe, Home } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';

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

function InfoRow({
  icon: Icon,
  color,
  label,
  value,
}: {
  icon: React.ElementType;
  color: string;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className={`w-7 h-7 rounded-lg ${color} flex items-center justify-center shrink-0 mt-0.5`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider leading-tight">{label}</p>
        <p className="text-sm text-foreground break-words">{value || '—'}</p>
      </div>
    </div>
  );
}

function ResultCard({ record, index }: { record: InfoRecord; index: number }) {
  const municipality = [record.MUNIC_RESIDENCIA, record.DEPTO_RESIDENCIA].filter(Boolean).join(', ') || null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="glass rounded-xl p-5 card-shine hover:shadow-[var(--shadow-card-hover)] hover:border-primary/20 transition-all duration-300 group"
    >
      {/* Header */}
      <div className="mb-4">
        <h3 className="font-bold text-base group-hover:text-primary transition-colors leading-tight">
          {formatFullName(record) || '—'}
        </h3>
        <Badge variant="secondary" className="mt-1.5 font-mono text-xs bg-muted/50 border-0">
          {record.CUI || '—'}
        </Badge>
      </div>

      {/* Info rows */}
      <div className="space-y-3 text-sm">
        <InfoRow icon={Cake}   color="bg-warning/10 text-warning"     label="Fecha de nacimiento" value={formatDate(record.FECHA_NACIMIENTO)} />
        <InfoRow icon={Mail}   color="bg-primary/10 text-primary"     label="Correo electrónico"  value={record.CORREO_ELECTRONICO} />
        <InfoRow icon={Phone}  color="bg-success/10 text-success"     label="Teléfono"            value={record.TELEFONO} />
        <InfoRow icon={Home}   color="bg-violet-500/10 text-violet-400" label="Dirección"          value={record.DIRECCION} />
        <InfoRow icon={MapPin} color="bg-destructive/10 text-destructive" label="Municipio / Departamento" value={municipality} />
        <InfoRow icon={Globe}  color="bg-sky-500/10 text-sky-400"     label="País de residencia"  value={record.PAIS_RESIDENCIA} />
      </div>

      {/* WS Registros */}
      <div className="mt-4 pt-3 border-t border-border/30">
        <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-2">Registros en sistemas</p>
        <div className="grid grid-cols-2 gap-1.5">
          {WS_FIELDS.map((ws) => {
            const val = record[ws.key];
            const active = val === 'SI';
            return (
              <div
                key={ws.key}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                  active
                    ? 'bg-success/10 text-success'
                    : 'bg-muted/30 text-muted-foreground'
                }`}
              >
                <span>{ws.label}</span>
                <span className={`font-bold ${active ? 'text-success' : 'text-muted-foreground/50'}`}>
                  {val ?? '—'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function SkeletonCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="glass rounded-xl p-5 space-y-3 animate-shimmer">
          <Skeleton className="h-5 w-3/4 bg-muted/30" />
          <Skeleton className="h-4 w-1/3 bg-muted/30" />
          <Skeleton className="h-4 w-full bg-muted/30" />
          <Skeleton className="h-4 w-2/3 bg-muted/30" />
          <Skeleton className="h-4 w-1/2 bg-muted/30" />
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
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-3 flex gap-2"
      >
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
            placeholder="Buscar por nombre o CUI..."
            className="pl-10 h-12 bg-background/50 border-border/50 text-base focus:border-primary/50 transition-all"
          />
        </div>
        <Button
          onClick={doSearch}
          className="h-12 px-8 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300"
          disabled={isFetching}
        >
          <SearchIcon className="h-4 w-4 mr-2" />
          Buscar
        </Button>
      </motion.div>

      {/* Empty state */}
      {!urlQuery && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center justify-center py-24 text-muted-foreground"
        >
          <div className="w-20 h-20 rounded-2xl bg-primary/5 flex items-center justify-center mb-5 animate-float">
            <Database className="h-10 w-10 text-primary/30" />
          </div>
          <p className="text-lg font-medium text-foreground/80">Ingresa un nombre o CUI para buscar</p>
          <p className="text-sm mt-1 text-muted-foreground/60">Los resultados aparecerán aquí</p>
        </motion.div>
      )}

      {/* Loading */}
      {urlQuery && isLoading && <SkeletonCards />}

      {/* No results */}
      {urlQuery && !isLoading && data && data.data.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <div className="w-16 h-16 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto mb-4">
            <SearchIcon className="h-8 w-8 text-muted-foreground/30" />
          </div>
          <p className="text-muted-foreground">No se encontraron resultados para "<span className="text-foreground font-semibold">{urlQuery}</span>"</p>
        </motion.div>
      )}

      {/* Results grid */}
      {data && data.data.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground font-medium">{totalCount}</span> resultados encontrados
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.data.map((record, i) => (
              <ResultCard key={record.id} record={record} index={i} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4"
            >
              <p className="text-sm text-muted-foreground">
                Página <span className="text-foreground font-medium">{urlPage}</span> de {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => goToPage(urlPage - 1)} disabled={urlPage <= 1} className="border-border/50">
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
                      className={pageNum === urlPage ? 'shadow-lg shadow-primary/20' : 'border-border/50'}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button variant="outline" size="sm" onClick={() => goToPage(urlPage + 1)} disabled={urlPage >= totalPages} className="border-border/50">
                  Siguiente
                </Button>
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
