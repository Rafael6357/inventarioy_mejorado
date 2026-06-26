type LogLevel = 'info' | 'warn' | 'error';
type LogEntry = { level: LogLevel; message: string; data?: unknown; timestamp: string };

const MAX_LOG_ENTRIES = 200;
const LOG_KEY = 'app_logs';

function saveToStorage(entry: LogEntry) {
  try {
    const logs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    logs.push(entry);
    if (logs.length > MAX_LOG_ENTRIES) logs.splice(0, logs.length - MAX_LOG_ENTRIES);
    localStorage.setItem(LOG_KEY, JSON.stringify(logs));
  } catch {}
}

function log(level: LogLevel, message: string, data?: unknown) {
  const entry: LogEntry = { level, message, timestamp: new Date().toISOString(), data };

  switch (level) {
    case 'error':
      console.error(`[${entry.timestamp}] [ERROR] ${message}`, data ?? '');
      break;
    case 'warn':
      console.warn(`[${entry.timestamp}] [WARN] ${message}`, data ?? '');
      break;
    default:
      console.log(`[${entry.timestamp}] [INFO] ${message}`, data ?? '');
  }

  saveToStorage(entry);
}

export const logger = {
  info: (message: string, data?: unknown) => log('info', message, data),
  warn: (message: string, data?: unknown) => log('warn', message, data),
  error: (message: string, data?: unknown) => log('error', message, data),
};

export function getLogs(): LogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
  } catch {
    return [];
  }
}

export function clearLogs() {
  localStorage.removeItem(LOG_KEY);
}
