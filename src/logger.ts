import * as core from '@actions/core';

/**
 * Log levels enum
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARNING = 2,
  ERROR = 3,
  NONE = 4
}

/**
 * Convert string log level to enum
 */
function parseLogLevel(level: string): LogLevel {
  switch (level.toLowerCase()) {
    case 'debug': return LogLevel.DEBUG;
    case 'info': return LogLevel.INFO;
    case 'warning': return LogLevel.WARNING;
    case 'error': return LogLevel.ERROR;
    case 'none': return LogLevel.NONE;
    default: return LogLevel.INFO;
  }
}

/**
 * Logger class for consistent logging throughout the application
 */
export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;

  private constructor() {
    // Set default log level from environment variable if present
    const envLogLevel = process.env.LOG_LEVEL;
    if (envLogLevel) {
      this.logLevel = parseLogLevel(envLogLevel);
    }
  }

  /**
   * Get the logger instance (singleton)
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Set the log level
   */
  public setLogLevel(level: LogLevel | string): void {
    if (typeof level === 'string') {
      this.logLevel = parseLogLevel(level);
    } else {
      this.logLevel = level;
    }
  }

  /**
   * Get the current log level
   */
  public getLogLevel(): LogLevel {
    return this.logLevel;
  }

  /**
   * Log a debug message
   */
  public debug(message: string): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      core.debug(message);
      console.log(`[DEBUG] ${message}`);
    }
  }

  /**
   * Log an info message
   */
  public info(message: string): void {
    if (this.logLevel <= LogLevel.INFO) {
      core.info(message);
      console.log(`[INFO] ${message}`);
    }
  }

  /**
   * Log a warning message
   */
  public warning(message: string): void {
    if (this.logLevel <= LogLevel.WARNING) {
      core.warning(message);
      console.warn(`[WARNING] ${message}`);
    }
  }

  /**
   * Log an error message
   */
  public error(message: string): void {
    if (this.logLevel <= LogLevel.ERROR) {
      core.error(message);
      console.error(`[ERROR] ${message}`);
    }
  }
}

// Export a default logger instance
export const logger = Logger.getInstance(); 