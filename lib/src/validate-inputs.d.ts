/**
 * Validates that a required input is provided
 * @param name Input name
 * @returns True if input is valid, false otherwise
 */
export declare function validateRequiredInput(name: string): boolean;
/**
 * Validates the LLM model input
 * @returns True if input is valid, false otherwise
 */
export declare function validateLLMModel(): boolean;
/**
 * Validates the log level input
 * @returns True if input is valid, false otherwise
 */
export declare function validateLogLevel(): boolean;
/**
 * Validates the file filtering input is a valid boolean
 * @returns True if input is valid, false otherwise
 */
export declare function validateFileFiltering(): boolean;
/**
 * Validates the ignore patterns input format
 * @returns True if input is valid, false otherwise
 */
export declare function validateIgnorePatterns(): boolean;
/**
 * Validates all action inputs
 * @returns True if all inputs are valid, false otherwise
 */
export declare function validateAllInputs(): boolean;
