export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export class Logger {
  constructor(private requestId?: string) {}

  private format(level: LogLevel, message: string, extra?: Record<string, any>) {
    const payload = {
      timestamp: new Date().toISOString(),
      level,
      requestId: this.requestId,
      message,
      ...extra,
    };
    return JSON.stringify(payload);
  }

  info(message: string, extra?: Record<string, any>) {
    console.log(this.format('info', message, extra));
  }

  warn(message: string, extra?: Record<string, any>) {
    console.warn(this.format('warn', message, extra));
  }

  error(message: string, extra?: Record<string, any>) {
    console.error(this.format('error', message, extra));
  }

  debug(message: string, extra?: Record<string, any>) {
    console.log(this.format('debug', message, extra));
  }
}

export const createLogger = (requestId?: string) => new Logger(requestId);
