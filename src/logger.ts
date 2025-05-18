import * as core from '@actions/core';
import * as winston from 'winston';

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
 * Convert LogLevel enum to winston log level
 */
function toWinstonLogLevel(level: LogLevel): string {
  switch (level) {
  case LogLevel.DEBUG: return 'debug';
  case LogLevel.INFO: return 'info';
  case LogLevel.WARNING: return 'warn';
  case LogLevel.ERROR: return 'error';
  case LogLevel.NONE: return 'error';
  default: return 'info';
  }
}

/**
 * Check if running in GitHub Actions environment
 */
function isGitHubActions(): boolean {
  return !!process.env.GITHUB_ACTIONS;
}

/**
 * Logger class for consistent logging throughout the application
 */
export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private winstonLogger: winston.Logger;
  private inGitHubActions: boolean;

  private constructor() {
    // Set default log level from environment variable if present
    const envLogLevel = process.env.LOG_LEVEL;
    if (envLogLevel) {
      this.logLevel = parseLogLevel(envLogLevel);
    }

    // Check if running in GitHub Actions
    this.inGitHubActions = isGitHubActions();

    // Create winston logger with custom format
    const customFormat = winston.format.printf(({ level, message }) => {
      const upperLevel = level.toUpperCase();
      return `${upperLevel.padEnd(7)}: ${message}`;
    });

    this.winstonLogger = winston.createLogger({
      level: toWinstonLogLevel(this.logLevel),
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        customFormat
      ),
      transports: [
        new winston.transports.Console()
      ],
      silent: this.logLevel === LogLevel.NONE || this.inGitHubActions
    });
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
    
    // Update winston logger level
    this.winstonLogger.level = toWinstonLogLevel(this.logLevel);
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
      if (this.inGitHubActions) {
        core.debug(message);
      } else {
        this.winstonLogger.debug(message);
      }
    }
  }

  /**
   * Log an info message
   */
  public info(message: string): void {
    if (this.logLevel <= LogLevel.INFO) {
      if (this.inGitHubActions) {
        core.info(message);
      } else {
        this.winstonLogger.info(message);
      }
    }
  }

  /**
   * Log a warning message
   */
  public warning(message: string): void {
    if (this.logLevel <= LogLevel.WARNING) {
      if (this.inGitHubActions) {
        core.warning(message);
      } else {
        this.winstonLogger.warn(message);
      }
    }
  }

  /**
   * Log an error message
   */
  public error(message: string): void {
    if (this.logLevel <= LogLevel.ERROR) {
      if (this.inGitHubActions) {
        core.error(message);
      } else {
        this.winstonLogger.error(message);
      }
    }
  }
}

// Export a default logger instance
export const logger = Logger.getInstance(); 