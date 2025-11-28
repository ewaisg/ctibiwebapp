/* Lightweight, environment-gated logger with safe redaction and timing helpers */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';
const LEVEL_RANK: Record<LogLevel, number> = { error: 0, warn: 1, info: 2, debug: 3 };

function getEnvLogLevel(): LogLevel {
  // Server-side
  const serverLevel = (process.env.LOG_LEVEL || process.env.NEXT_LOG_LEVEL || '').toLowerCase();
  if (['error', 'warn', 'info', 'debug'].includes(serverLevel)) return serverLevel as LogLevel;
  // Client-side with localStorage override
  if (typeof window !== 'undefined') {
    try {
      const lvl = (localStorage.getItem('LOG_LEVEL') || '').toLowerCase();
      if (['error', 'warn', 'info', 'debug'].includes(lvl)) return lvl as LogLevel;
    } catch {}
  }
  return process.env.NODE_ENV === 'production' ? 'warn' : 'info';
}

function shouldLog(level: LogLevel): boolean {
  const current = getEnvLogLevel();
  return LEVEL_RANK[level] <= LEVEL_RANK[current];
}

const REDACT_KEYS = ['authorization', 'cookie', 'cookies', 'token', 'privatekey', 'clientemail', 'apikey'];
function redact(value: unknown): unknown {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (REDACT_KEYS.includes(k.toLowerCase())) out[k] = '[redacted]';
      else out[k] = redact(v);
    }
    return out;
  }
  if (typeof value === 'string') {
    // Basic token-like string masking
    if (value.length > 64) return `${value.slice(0, 8)}…[redacted]`;
  }
  return value;
}

function baseLog(level: LogLevel, scope: string | undefined, message: string, meta?: Record<string, unknown>) {
  if (!shouldLog(level)) return;
  const ts = new Date().toISOString();
  const entry = { ts, level, scope, msg: message, ...(meta ? { meta: redact(meta) } : {}) };
  // Use appropriate console method
  const line = `[${entry.ts}] ${scope ? `[${scope}] ` : ''}${level.toUpperCase()}: ${message}`;
  switch (level) {
    case 'error':
      meta ? console.error(line, entry.meta) : console.error(line);
      break;
    case 'warn':
      meta ? console.warn(line, entry.meta) : console.warn(line);
      break;
    case 'info':
      meta ? console.info(line, entry.meta) : console.info(line);
      break;
    case 'debug':
      meta ? console.debug(line, entry.meta) : console.debug(line);
      break;
  }
}

export function createLogger(scope?: string) {
  return {
    error: (message: string, meta?: Record<string, unknown>) => baseLog('error', scope, message, meta),
    warn: (message: string, meta?: Record<string, unknown>) => baseLog('warn', scope, message, meta),
    info: (message: string, meta?: Record<string, unknown>) => baseLog('info', scope, message, meta),
    debug: (message: string, meta?: Record<string, unknown>) => baseLog('debug', scope, message, meta),
    time: (label: string, extraMeta?: Record<string, unknown>) => {
      const start = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      return {
        end: (endMeta?: Record<string, unknown>) => {
          const end = (typeof performance !== 'undefined' ? performance.now() : Date.now());
          const durationMs = end - start;
          baseLog('info', scope, `timer:${label}`, { durationMs, ...extraMeta, ...endMeta });
        }
      };
    }
  };
}

// Default logger without scope
export const logger = createLogger();
