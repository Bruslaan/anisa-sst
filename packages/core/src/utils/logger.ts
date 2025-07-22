interface LogContext {
  traceId?: string;
  userId?: string;
  messageId?: string;
  step?: string;
  [key: string]: any;
}

export class Logger {
  private static formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const traceId = context?.traceId || 'no-trace';
    const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
    
    return `[${timestamp}] [${level.toUpperCase()}] [trace:${traceId}] ${message}${contextStr}`;
  }

  static info(message: string, context?: LogContext): void {
    console.info(this.formatMessage('info', message, context));
  }

  static warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  static error(message: string, context?: LogContext, error?: Error): void {
    const errorStr = error ? ` | error: ${error.message} | stack: ${error.stack}` : '';
    console.error(this.formatMessage('error', message, context) + errorStr);
  }

  static debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  static createContextLogger(baseContext: LogContext) {
    return {
      info: (message: string, additionalContext?: LogContext) => 
        Logger.info(message, { ...baseContext, ...additionalContext }),
      
      warn: (message: string, additionalContext?: LogContext) => 
        Logger.warn(message, { ...baseContext, ...additionalContext }),
      
      error: (message: string, additionalContext?: LogContext, error?: Error) => 
        Logger.error(message, { ...baseContext, ...additionalContext }, error),
      
      debug: (message: string, additionalContext?: LogContext) => 
        Logger.debug(message, { ...baseContext, ...additionalContext }),
    };
  }
}

export type ContextLogger = ReturnType<typeof Logger.createContextLogger>;