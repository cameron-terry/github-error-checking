/**
 * Action input validation utilities to ensure required inputs are available
 * and to validate the format of inputs
 */
import * as core from '@actions/core';
import { logger } from './logger';

/**
 * Validates that a required input is provided
 * @param name Input name
 * @returns True if input is valid, false otherwise
 */
export function validateRequiredInput(name: string): boolean {
  try {
    const value = core.getInput(name, { required: true });
    if (!value) {
      core.setFailed(`Required input '${name}' is missing`);
      return false;
    }
    return true;
  } catch (error) {
    core.setFailed(`Failed to validate required input '${name}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

/**
 * Validates the LLM model input
 * @returns True if input is valid, false otherwise
 */
export function validateLLMModel(): boolean {
  try {
    const supportedModels = ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo'];
    const modelName = core.getInput('llm-model') || 'gpt-3.5-turbo';
    
    if (!supportedModels.includes(modelName)) {
      logger.warning(`LLM model '${modelName}' is not in the list of supported models: ${supportedModels.join(', ')}`);
      logger.info(`Falling back to default model 'gpt-3.5-turbo'`);
      return false;
    }
    return true;
  } catch (error) {
    logger.warning(`Failed to validate LLM model input: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

/**
 * Validates the log level input
 * @returns True if input is valid, false otherwise
 */
export function validateLogLevel(): boolean {
  try {
    const supportedLevels = ['debug', 'info', 'warning', 'error', 'none'];
    const logLevel = core.getInput('log-level') || 'info';
    
    if (!supportedLevels.includes(logLevel.toLowerCase())) {
      logger.warning(`Log level '${logLevel}' is not in the list of supported levels: ${supportedLevels.join(', ')}`);
      logger.info(`Falling back to default log level 'info'`);
      return false;
    }
    return true;
  } catch (error) {
    logger.warning(`Failed to validate log level input: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

/**
 * Validates the file filtering input is a valid boolean
 * @returns True if input is valid, false otherwise
 */
export function validateFileFiltering(): boolean {
  try {
    const filterValue = core.getInput('enable-file-filtering') || 'true';
    if (filterValue !== 'true' && filterValue !== 'false') {
      logger.warning(`File filtering input '${filterValue}' is not a valid boolean value (true/false)`);
      logger.info(`Falling back to default value 'true'`);
      return false;
    }
    return true;
  } catch (error) {
    logger.warning(`Failed to validate file filtering input: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

/**
 * Validates the ignore patterns input format
 * @returns True if input is valid, false otherwise
 */
export function validateIgnorePatterns(): boolean {
  try {
    const patterns = core.getInput('ignore-patterns') || '';
    
    // Empty string is valid (no additional patterns)
    if (!patterns) {
      return true;
    }
    
    // Patterns should be comma-separated
    const patternList = patterns.split(',').map(p => p.trim());
    
    // All patterns should be non-empty after trimming
    const hasEmptyPattern = patternList.some(p => !p);
    if (hasEmptyPattern) {
      logger.warning('Ignore patterns input contains empty patterns. Please use comma-separated list with no empty items.');
      return false;
    }
    
    return true;
  } catch (error) {
    logger.warning(`Failed to validate ignore patterns input: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

/**
 * Validates all action inputs
 * @returns True if all inputs are valid, false otherwise
 */
export function validateAllInputs(): boolean {
  const requiredInputsValid = [
    validateRequiredInput('github-token'),
    validateRequiredInput('openai-api-key')
  ].every(Boolean);
  
  const optionalInputsValid = [
    validateLLMModel(),
    validateLogLevel(),
    validateFileFiltering(),
    validateIgnorePatterns()
  ].every(Boolean);
  
  return requiredInputsValid && optionalInputsValid;
} 