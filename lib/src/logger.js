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
            core.debug(message);
            // Only use console.log when not in GitHub Actions
            if (!isGitHubActions()) {
                console.log(`[DEBUG] ${message}`);
            }
        }
    }
    /**
     * Log an info message
     */
    info(message) {
        if (this.logLevel <= LogLevel.INFO) {
            core.info(message);
            // Only use console.log when not in GitHub Actions
            if (!isGitHubActions()) {
                console.log(`[INFO] ${message}`);
            }
        }
    }
    /**
     * Log a warning message
     */
    warning(message) {
        if (this.logLevel <= LogLevel.WARNING) {
            core.warning(message);
            // Only use console.warn when not in GitHub Actions
            if (!isGitHubActions()) {
                console.warn(`[WARNING] ${message}`);
            }
        }
    }
    /**
     * Log an error message
     */
    error(message) {
        if (this.logLevel <= LogLevel.ERROR) {
            core.error(message);
            // Only use console.error when not in GitHub Actions
            if (!isGitHubActions()) {
                console.error(`[ERROR] ${message}`);
            }
        }
    }
}
exports.Logger = Logger;
// Export a default logger instance
exports.logger = Logger.getInstance();
//# sourceMappingURL=logger.js.map