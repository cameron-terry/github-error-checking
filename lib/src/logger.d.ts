/**
 * Log levels enum
 */
export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARNING = 2,
    ERROR = 3,
    NONE = 4
}
/**
 * Logger class for consistent logging throughout the application
 */
export declare class Logger {
    private static instance;
    private logLevel;
    private constructor();
    /**
     * Get the logger instance (singleton)
     */
    static getInstance(): Logger;
    /**
     * Set the log level
     */
    setLogLevel(level: LogLevel | string): void;
    /**
     * Get the current log level
     */
    getLogLevel(): LogLevel;
    /**
     * Log a debug message
     */
    debug(message: string): void;
    /**
     * Log an info message
     */
    info(message: string): void;
    /**
     * Log a warning message
     */
    warning(message: string): void;
    /**
     * Log an error message
     */
    error(message: string): void;
}
export declare const logger: Logger;
