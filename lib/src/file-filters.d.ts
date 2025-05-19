/**
 * Checks if a file should be ignored based on its path/name
 * @param filePath Path of the file to check
 * @param language Programming language context (defaults to TypeScript)
 * @returns True if the file should be ignored, false otherwise
 */
export declare function shouldIgnoreFile(filePath: string, language?: string): boolean;
/**
 * Checks if file type filtering is enabled
 * @returns True if file filtering is enabled, false otherwise
 */
export declare function isFileFilteringEnabled(): boolean;
