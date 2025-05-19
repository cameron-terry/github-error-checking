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
 * Grouped sections by file
 */
export interface FileChanges {
    file: string;
    sections: AddedCodeSection[];
}
/**
 * Class to handle LLM services for code analysis
 */
export declare class LLMService {
    private openai;
    private modelName;
    constructor(apiKey?: string, modelName?: string);
    /**
     * Analyzes code for error handling issues by file
     * @param sections Array of added code sections to analyze
     * @returns Analysis results by file
     */
    analyzeByFile(sections: AddedCodeSection[]): Promise<LLMAnalysisResult[]>;
    /**
     * Groups sections by file path
     * @param sections Array of code sections
     * @returns Array of file groups
     */
    private groupSectionsByFile;
    /**
     * Analyzes all changes in a file
     * @param fileChanges File and its changed sections
     * @returns Analysis result with issues and score
     */
    private analyzeFileChanges;
    /**
     * Analyzes code for error handling issues (individual section)
     * @param section Added code section to analyze
     * @returns Analysis result with issues and score
     */
    analyzeErrorHandling(section: AddedCodeSection): Promise<LLMAnalysisResult>;
    /**
     * Creates a structured prompt for analyzing multiple sections in a file
     */
    private createFileAnalysisPrompt;
    /**
     * Creates a structured prompt for the LLM to analyze code
     */
    private createAnalysisPrompt;
}
