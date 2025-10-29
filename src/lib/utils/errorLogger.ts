// Error logging and monitoring utilities
interface ErrorLog {
  message: string;
  stack?: string;
  context: string;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  userAgent: string;
  url: string;
}

class ErrorLogger {
  private static instance: ErrorLogger;
  
  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  logError(error: Error, context: string, metadata?: Record<string, any>) {
    const errorLog: ErrorLog = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server',
      url: typeof window !== 'undefined' ? window.location.href : 'Server',
      ...metadata
    };

    // Development logging
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorLogger]', errorLog);
    }

    // Production logging (integrate with your monitoring service)
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoringService(errorLog);
    }
  }

  private async sendToMonitoringService(errorLog: ErrorLog) {
    try {
      // Replace with your monitoring service (Sentry, LogRocket, etc.)
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorLog)
      });
    } catch (e) {
      console.error('Failed to send error to monitoring service:', e);
    }
  }
}

export const errorLogger = ErrorLogger.getInstance();

