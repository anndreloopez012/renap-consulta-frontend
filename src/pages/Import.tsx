import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth';
import {
  Upload,
  ChevronDown,
  ChevronUp,
  X,
  FileText,
  Database,
  CheckCircle,
  AlertCircle,
  Info,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api-info.gts-guatemala.com';

const CSV_COLUMNS = [
  'CUI',
  'PRIMER_NOMBRE',
  'SEGUNDO_NOMBRE',
  'TERCER_NOMBRE',
  'PRIMER_APELLIDO',
  'SEGUNDO_APELLIDO',
  'FECHA_NACIMIENTO',
  'CORREO_ELECTRONICO',
  'TELEFONO',
  'PAIS_RESIDENCIA',
  'DEPTO_RESIDENCIA',
  'MUNIC_RESIDENCIA',
  'DIRECCION',
  'WS_MIDES',
  'WS_MAGA',
  'WS_MSPAS',
  'WS_MINECO',
];

type ImportStatus = 'idle' | 'importing' | 'complete' | 'error';

interface ImportStats {
  processed: number;
  inserted: number;
  failed: number;
  skipped: number;
  rate: number;
  elapsed: string;
}

interface LogEntry {
  id: number;
  time: string;
  type: string;
  message: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function getTime(): string {
  return new Date().toLocaleTimeString('es-GT', { hour12: false });
}

const EMPTY_STATS: ImportStats = {
  processed: 0,
  inserted: 0,
  failed: 0,
  skipped: 0,
  rate: 0,
  elapsed: '0s',
};

export default function ImportPage() {
  const jwt = useAuthStore((s) => s.jwt);

  // File
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Options
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [delimiter, setDelimiter] = useState(';');
  const [encoding, setEncoding] = useState('auto');

  // Import state
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [stats, setStats] = useState<ImportStats>(EMPTY_STATS);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const logRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const logIdRef = useRef(0);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const addLog = useCallback((type: string, message: string) => {
    const entry: LogEntry = { id: logIdRef.current++, time: getTime(), type, message };
    setLog((prev) => {
      const next = [...prev, entry];
      return next.length > 500 ? next.slice(-500) : next;
    });
  }, []);

  const handleFile = (f: File) => {
    if (!f.name.toLowerCase().endsWith('.csv')) return;
    setFile(f);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImport = async () => {
    if (!file || !jwt) return;

    const controller = new AbortController();
    abortRef.current = controller;

    setStatus('importing');
    setStats(EMPTY_STATS);
    setLog([]);
    setErrorMessage('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('delimiter', delimiter);
    formData.append('encoding', encoding);

    let completed = false;

    const handleEvent = (event: Record<string, unknown>) => {
      switch (event.type) {
        case 'start':
          addLog('start', String(event.message ?? 'Importación iniciada'));
          break;

        case 'headers': {
          const cols = (event.columns as string[]) ?? [];
          addLog('headers', `Columnas detectadas: ${cols.join(', ')}`);
          break;
        }

        case 'progress': {
          const processed = Number(event.processed ?? 0);
          const inserted = Number(event.inserted ?? 0);
          const failed = Number(event.failed ?? 0);
          const skipped = Number(event.skipped ?? 0);
          const rate = Number(event.rate ?? 0);
          const elapsed = String(event.elapsed ?? '');
          setStats({ processed, inserted, failed, skipped, rate, elapsed });
          addLog(
            'progress',
            `${processed.toLocaleString('es-GT')} procesadas · ${inserted.toLocaleString('es-GT')} insertadas · ${failed.toLocaleString('es-GT')} fallidas · ${rate.toLocaleString('es-GT')} filas/seg`,
          );
          break;
        }

        case 'rowError':
          addLog('rowError', String(event.message ?? 'Error en fila'));
          setStats((prev) => ({ ...prev, failed: prev.failed + 1 }));
          break;

        case 'complete': {
          const processed = Number(event.processed ?? 0);
          const inserted = Number(event.inserted ?? 0);
          const failed = Number(event.failed ?? 0);
          const skipped = Number(event.skipped ?? 0);
          const elapsed = String(event.elapsed ?? '');
          setStats({ processed, inserted, failed, skipped, rate: 0, elapsed });
          addLog('complete', String(event.message ?? 'Importación completada'));
          setStatus('complete');
          completed = true;
          break;
        }

        case 'error': {
          const msg = String(event.message ?? 'Error desconocido');
          setErrorMessage(msg);
          addLog('error', msg);
          setStatus('error');
          completed = true;
          break;
        }
      }
    };

    try {
      const response = await fetch(`${API_BASE}/api/infos/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        let msg = 'Error al iniciar la importación';
        try {
          const data = await response.json();
          msg = data?.error?.message ?? data?.message ?? msg;
        } catch {}
        setErrorMessage(msg);
        setStatus('error');
        addLog('error', msg);
        return;
      }

      if (!response.body) {
        const msg = 'El servidor no retornó un stream válido';
        setErrorMessage(msg);
        setStatus('error');
        addLog('error', msg);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              handleEvent(event);
            } catch {}
          }
        }
      }

      if (!completed) {
        const msg = 'Conexión interrumpida. Verifica el servidor.';
        setErrorMessage(msg);
        setStatus('error');
        addLog('error', msg);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const msg = 'Conexión interrumpida. Verifica el servidor.';
      setErrorMessage(msg);
      setStatus('error');
      addLog('error', msg);
    }
  };

  const handleReset = () => {
    abortRef.current?.abort();
    setFile(null);
    setStatus('idle');
    setStats(EMPTY_STATS);
    setLog([]);
    setErrorMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isImporting = status === 'importing';
  const fileSizeWarning = file && file.size > 1024 * 1024 * 1024; // >1 GB

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <Upload className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Importar Datos CSV</h1>
            <p className="text-sm text-slate-400">
              Carga masiva de registros desde un archivo CSV al sistema
            </p>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── LEFT COLUMN ─── */}
        <div className="space-y-4">
          {/* Drop zone card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-300 mb-4">Archivo CSV</h2>

            {fileSizeWarning && (
              <div className="mb-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Archivo grande detectado ({formatBytes(file!.size)}). El procesamiento puede
                  tardar varios minutos. No cierres esta ventana.
                </span>
              </div>
            )}

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !file && !isImporting && fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-xl transition-all duration-200',
                !file && !isImporting && 'cursor-pointer',
                isDragging
                  ? 'border-indigo-500 bg-indigo-500/5'
                  : file
                    ? 'border-slate-700'
                    : 'border-slate-600 hover:border-indigo-500 hover:bg-slate-800/50',
                file ? 'p-4' : 'p-10',
              )}
            >
              {file ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{file.name}</p>
                    <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    disabled={isImporting}
                    className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                    <Upload
                      className={cn(
                        'h-7 w-7 transition-colors',
                        isDragging ? 'text-indigo-400' : 'text-slate-500',
                      )}
                    />
                  </div>
                  <p className="text-sm font-medium text-slate-300 mb-1">
                    Arrastra tu archivo CSV aquí
                  </p>
                  <p className="text-xs text-slate-500 mb-2">o haz clic para seleccionar</p>
                  <p className="text-xs text-slate-600">Archivos .csv · hasta 2 GB</p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleInputChange}
              disabled={isImporting}
            />
          </div>

          {/* Advanced options */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors"
            >
              <span>Opciones avanzadas</span>
              {advancedOpen ? (
                <ChevronUp className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              )}
            </button>

            <AnimatePresence initial={false}>
              {advancedOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 border-t border-slate-800">
                    <div className="pt-4 grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">
                          Delimitador
                        </label>
                        <select
                          value={delimiter}
                          onChange={(e) => setDelimiter(e.target.value)}
                          disabled={isImporting}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                        >
                          <option value=";">; (punto y coma)</option>
                          <option value=",">, (coma)</option>
                          <option value="|">| (pipe)</option>
                          <option value={'\t'}>\t (tabulación)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">
                          Encoding
                        </label>
                        <select
                          value={encoding}
                          onChange={(e) => setEncoding(e.target.value)}
                          disabled={isImporting}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                        >
                          <option value="auto">Auto-detectar</option>
                          <option value="utf8">UTF-8</option>
                          <option value="latin1">Latin1 / Windows-1252</option>
                        </select>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 flex items-start gap-1.5 mt-3">
                      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-600" />
                      El sistema detecta automáticamente si el archivo tiene tildes correctamente.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* CSV columns info */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Columnas del CSV</h3>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {CSV_COLUMNS.map((col) => (
                <span
                  key={col}
                  className="px-2 py-0.5 bg-slate-800 text-slate-400 text-xs rounded-md font-mono"
                >
                  {col}
                </span>
              ))}
            </div>
            <p className="text-xs text-slate-500 flex items-start gap-1.5">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-600" />
              El CSV debe tener estas columnas exactas en el encabezado (no se requieren todas).
            </p>
          </div>

          {/* Submit */}
          <Button
            onClick={handleImport}
            disabled={!file || isImporting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6 text-base font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-5 w-5" />
                Iniciar Importación
              </>
            )}
          </Button>
        </div>

        {/* ─── RIGHT COLUMN ─── */}
        <div className="space-y-4">
          {status === 'idle' ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center justify-center text-center min-h-[400px] p-12">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                <Database className="h-8 w-8 text-slate-600" />
              </div>
              <p className="text-slate-400 text-sm">El progreso de importación aparecerá aquí</p>
            </div>
          ) : (
            <>
              {/* Status badge */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-300">Estado</span>
                {isImporting && (
                  <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    Procesando...
                  </span>
                )}
                {status === 'complete' && (
                  <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Completado
                  </span>
                )}
                {status === 'error' && (
                  <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-semibold">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Error
                  </span>
                )}
              </div>

              {/* Stats cards 2x2 */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Procesadas" value={stats.processed} variant="blue" icon="📋" />
                <StatCard label="Insertadas" value={stats.inserted} variant="green" icon="✓" />
                <StatCard label="Fallidas" value={stats.failed} variant="red" icon="✗" />
                <StatCard label="Omitidas" value={stats.skipped} variant="yellow" icon="⚠" />
              </div>

              {/* Indeterminate progress bar */}
              {isImporting && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <div className="flex justify-between items-center mb-2 text-xs text-slate-400">
                    <span>
                      {stats.processed.toLocaleString('es-GT')} filas procesadas
                    </span>
                    <span>{stats.rate.toLocaleString('es-GT')} filas/seg</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden relative">
                    <motion.div
                      className="absolute top-0 h-full bg-indigo-600 rounded-full"
                      style={{ width: '38%' }}
                      animate={{ left: ['-38%', '140%'] }}
                      transition={{
                        duration: 1.6,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        repeatType: 'mirror',
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Tiempo transcurrido: {stats.elapsed}
                  </p>
                </div>
              )}

              {/* Elapsed (post-import) */}
              {!isImporting && (status === 'complete' || status === 'error') && stats.elapsed !== '0s' && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 text-sm text-slate-400">
                  Tiempo total:{' '}
                  <span className="text-white font-medium">{stats.elapsed}</span>
                </div>
              )}

              {/* Event log */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Log de eventos</h3>
                <div
                  ref={logRef}
                  className="overflow-y-auto space-y-1.5 pr-1"
                  style={{ maxHeight: isImporting ? '200px' : '300px' }}
                >
                  {log.length === 0 && (
                    <p className="text-xs text-slate-600">Esperando eventos...</p>
                  )}
                  {log.map((entry) => (
                    <LogLine key={entry.id} entry={entry} />
                  ))}
                </div>
              </div>

              {/* Final summary */}
              {status === 'complete' && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5">
                  <p className="text-emerald-400 font-semibold mb-1">
                    Importacion completada
                  </p>
                  <p className="text-sm text-emerald-300/70">
                    {stats.inserted.toLocaleString('es-GT')} registros insertados en{' '}
                    {stats.elapsed}
                  </p>
                  {stats.failed > 0 && (
                    <p className="text-sm text-amber-400/80 mt-1">
                      {stats.failed.toLocaleString('es-GT')} filas tuvieron errores y fueron
                      omitidas
                    </p>
                  )}
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="mt-4 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                  >
                    Nueva importacion
                  </Button>
                </div>
              )}

              {/* Error summary */}
              {status === 'error' && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5">
                  <p className="text-red-400 font-semibold mb-1">Error en la importacion</p>
                  <p className="text-sm text-red-300/70">{errorMessage}</p>
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="mt-4 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  >
                    Intentar nuevamente
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  variant: 'blue' | 'green' | 'red' | 'yellow';
  icon: string;
}

function StatCard({ label, value, variant, icon }: StatCardProps) {
  const styles = {
    blue: { text: 'text-blue-400', bg: 'bg-blue-500/10' },
    green: { text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    red: { text: 'text-red-400', bg: 'bg-red-500/10' },
    yellow: { text: 'text-amber-400', bg: 'bg-amber-500/10' },
  }[variant];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500">{label}</span>
        <span
          className={cn(
            'w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold',
            styles.text,
            styles.bg,
          )}
        >
          {icon}
        </span>
      </div>
      <p className={cn('text-2xl font-bold tabular-nums', styles.text)}>
        {value.toLocaleString('es-GT')}
      </p>
    </div>
  );
}

const LOG_TYPE_CONFIG: Record<string, { icon: string; cls: string }> = {
  start: { icon: 'i', cls: 'text-blue-400' },
  headers: { icon: '#', cls: 'text-slate-400' },
  progress: { icon: '~', cls: 'text-indigo-400' },
  rowError: { icon: '!', cls: 'text-amber-400' },
  complete: { icon: 'v', cls: 'text-emerald-400 font-semibold' },
  error: { icon: 'x', cls: 'text-red-400 font-semibold' },
};

const LOG_ICONS: Record<string, string> = {
  start: 'ℹ',
  headers: '▤',
  progress: '≈',
  rowError: '⚠',
  complete: '✓',
  error: '✕',
};

function LogLine({ entry }: { entry: LogEntry }) {
  const cfg = LOG_TYPE_CONFIG[entry.type] ?? { icon: '·', cls: 'text-slate-400' };
  const icon = LOG_ICONS[entry.type] ?? '·';

  return (
    <div className={cn('flex items-start gap-2 text-xs', cfg.cls)}>
      <span className="text-slate-600 shrink-0 tabular-nums">[{entry.time}]</span>
      <span className="shrink-0 w-3 text-center">{icon}</span>
      <span className="break-all">{entry.message}</span>
    </div>
  );
}
