"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = exports.LogLevel = void 0;
const core = __importStar(require("@actions/core"));
const winston = __importStar(require("winston"));
/**
 * Log levels enum
 */
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARNING"] = 2] = "WARNING";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    LogLevel[LogLevel["NONE"] = 4] = "NONE";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
/**
 * Convert string log level to enum
 */
function parseLogLevel(level) {
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
function toWinstonLogLevel(level) {
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
function isGitHubActions() {
    return !!process.env.GITHUB_ACTIONS;
}
/**
 * Logger class for consistent logging throughout the application
 */
class Logger {
    constructor() {
        this.logLevel = LogLevel.INFO;
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
            format: winston.format.combine(winston.format.colorize({ all: true }), customFormat),
            transports: [
                new winston.transports.Console()
            ],
            silent: this.logLevel === LogLevel.NONE || this.inGitHubActions
        });
    }
    /**
     * Get the logger instance (singleton)
     */
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    /**
     * Set the log level
     */
    setLogLevel(level) {
        if (typeof level === 'string') {
            this.logLevel = parseLogLevel(level);
        }
        else {
            this.logLevel = level;
        }
        // Update winston logger level
        this.winstonLogger.level = toWinstonLogLevel(this.logLevel);
    }
    /**
     * Get the current log level
     */
    getLogLevel() {
        return this.logLevel;
    }
    /**
     * Log a debug message
     */
    debug(message) {
        if (this.logLevel <= LogLevel.DEBUG) {
            if (this.inGitHubActions) {
                core.debug(message);
            }
            else {
                this.winstonLogger.debug(message);
            }
        }
    }
    /**
     * Log an info message
     */
    info(message) {
        if (this.logLevel <= LogLevel.INFO) {
            if (this.inGitHubActions) {
                core.info(message);
            }
            else {
                this.winstonLogger.info(message);
            }
        }
    }
    /**
     * Log a warning message
     */
    warning(message) {
        if (this.logLevel <= LogLevel.WARNING) {
            if (this.inGitHubActions) {
                core.warning(message);
            }
            else {
                this.winstonLogger.warn(message);
            }
        }
    }
    /**
     * Log an error message
     */
    error(message) {
        if (this.logLevel <= LogLevel.ERROR) {
            if (this.inGitHubActions) {
                core.error(message);
            }
            else {
                this.winstonLogger.error(message);
            }
        }
    }
}
exports.Logger = Logger;
// Export a default logger instance
exports.logger = Logger.getInstance();
//# sourceMappingURL=logger.js.map