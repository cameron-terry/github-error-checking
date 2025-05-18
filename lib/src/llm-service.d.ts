import { AddedCodeSection } from './diff-utils';
/**
 * Interface for LLM analysis response
 */
export interface LLMAnalysisResult {
    file: string;
    issues: ErrorHandlingIssue[];
    score: number;
}
/**
 * Interface for error handling issues
 */
export interface ErrorHandlingIssue {
    lineNumber?: number;
    description: string;
    suggestion: string;
    severity: 'low' | 'medium' | 'high';
}
/**
 * Class to handle LLM services for code analysis
 */
export declare class LLMService {
    private openai;
    private modelName;
    constructor(apiKey?: string, modelName?: string);
    /**
     * Analyzes code for error handling issues
     * @param section Added code section to analyze
     * @returns Analysis result with issues and score
     */
    analyzeErrorHandling(section: AddedCodeSection): Promise<LLMAnalysisResult>;
    /**
     * Creates a structured prompt for the LLM to analyze code
     */
    private createAnalysisPrompt;
}
