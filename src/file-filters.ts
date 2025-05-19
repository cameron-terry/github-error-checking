/**
 * Utilities for filtering files based on their extension or patterns
 */
import * as core from '@actions/core';

/**
 * Map of languages to their ignored file patterns
 */
const IGNORED_FILES_BY_LANGUAGE: Record<string, string[]> = {
  // TypeScript/JavaScript ecosystem
  'ts': [
    // Config and data files
    '.json',
    '.map',
    '.lock',
    // Generated TypeScript files
    '.d.ts',
    // Minified files
    '.min.js',
    '.min.css',
    // Common build outputs
    'dist/',
    'build/',
    'out/',
    'coverage/',
    // Dependencies
    'node_modules/',
    // Version control
    '.git/',
    // Test fixtures and snapshots
    '.spec.',
    '.test.',
    '.snap',
    // Other common auto-generated files
    '.eslintrc',
    '.prettierrc',
    'tsconfig.json',
    'package.json',
    'package-lock.json',
    'yarn.lock',
    // CI/CD config files
    '.github/',
    '.circleci/',
    '.travis.yml',
    // Docs
    '.md',
    'docs/',
    'README'
  ]
};

/**
 * Default language to use if none is specified
 */
const DEFAULT_LANGUAGE = 'ts';

/**
 * Gets additional ignored patterns from action inputs or environment variables
 * @returns Array of additional patterns to ignore
 */
function getAdditionalIgnorePatterns(): string[] {
  // Try to get ignored patterns from action inputs
  try {
    const ignorePatterns = core.getInput('ignore-patterns', { required: false });
    if (ignorePatterns) {
      return ignorePatterns.split(',').map(pattern => pattern.trim());
    }
  } catch (error) {
    // Input might not be available if not running in GitHub Actions
    // Log the error for debugging purposes
    console.error('Error getting ignore-patterns input:', error instanceof Error ? error.message : 'Unknown error');
  }
  
  // Try environment variable as fallback
  const envIgnorePatterns = process.env.IGNORE_PATTERNS;
  if (envIgnorePatterns) {
    return envIgnorePatterns.split(',').map(pattern => pattern.trim());
  }
  
  return [];
}

/**
 * Checks if a file should be ignored based on its path/name
 * @param filePath Path of the file to check
 * @param language Programming language context (defaults to TypeScript)
 * @returns True if the file should be ignored, false otherwise
 */
export function shouldIgnoreFile(filePath: string, language: string = DEFAULT_LANGUAGE): boolean {
  // Get the base patterns for the specified language
  const patterns = [...(IGNORED_FILES_BY_LANGUAGE[language] || IGNORED_FILES_BY_LANGUAGE[DEFAULT_LANGUAGE])];
  
  // Add any additional patterns specified through inputs
  patterns.push(...getAdditionalIgnorePatterns());
  
  // Convert the path to lowercase for case-insensitive matching
  const lowerFilePath = filePath.toLowerCase();
  
  // Check if any pattern matches the file path
  for (const pattern of patterns) {
    // Special handling for file extensions (patterns starting with '.')
    if (pattern.startsWith('.') && !pattern.includes('/')) {
      // Check if filename ends with the extension
      if (lowerFilePath.endsWith(pattern)) {
        return true;
      }
    } 
    // For non-extension patterns, use regular inclusion check
    else if (lowerFilePath.includes(pattern)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Checks if file type filtering is enabled
 * @returns True if file filtering is enabled, false otherwise
 */
export function isFileFilteringEnabled(): boolean {
  // Try to get the input from GitHub Actions
  try {
    const enableFiltering = core.getInput('enable-file-filtering', { required: false });
    
    // If a value is provided, parse it as boolean
    if (enableFiltering) {
      return enableFiltering.toLowerCase() === 'true';
    }
  } catch (error) {
    // Input might not be available if not running in GitHub Actions
    // Log the error for debugging purposes
    console.error('Error getting enable-file-filtering input:', error instanceof Error ? error.message : 'Unknown error');
  }
  
  // Try environment variable as fallback
  const envEnableFiltering = process.env.ENABLE_FILE_FILTERING;
  if (envEnableFiltering) {
    return envEnableFiltering.toLowerCase() === 'true';
  }
  
  // Default to enabled
  return true;
} 