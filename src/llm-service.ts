/**
 * LLM Service for analyzing code error handling patterns
 */
import { OpenAI } from 'openai';
import * as core from '@actions/core';
import { AddedCodeSection } from './diff-utils';
import { logger } from './logger';
import { shouldIgnoreFile, isFileFilteringEnabled } from './file-filters';

/**
 * Constants for LLM prompts
 */
const LLM_PROMPTS = {
  ERROR_ANALYSIS_INSTRUCTION: "Identify any missing or improper error handling in the ADDED CODE section only.",
  ERROR_HANDLING_PATTERNS: `Consider these error handling patterns:
1. Exception handling (try/catch blocks)
2. Null/undefined checks
3. Error propagation
4. Input validation
5. Edge cases
6. Resource cleanup`,
  JSON_RESPONSE_FORMAT: `Analyze only the ADDED CODE section for missing or improper error handling. Do NOT evaluate unchanged code or suggest general improvements.

Focus only on the following error handling concerns:
1. Missing exception handling (e.g. try/catch)
2. Missing null/undefined checks
3. Improper error propagation (e.g. swallowing errors)
4. Lack of input validation
5. Missing edge case checks
6. Missing cleanup of open resources (e.g. file handles, DB connections)

Only report issues that are likely to cause real bugs, runtime errors, or maintainability problems. Do not report stylistic issues or theoretical concerns.

Respond with a JSON object containing:
1. An "issues" array with objects containing:
   - description: What the issue is and why it matters
   - suggestion: A specific and actionable code fix
   - severity: "low", "medium", or "high" based on potential impact
   - lineNumber: Approximate line number in the ADDED CODE section (optional)
2. A "score" from 0 to 10 rating the overall quality of error handling (10 = excellent, 0 = critically flawed)

Example:
{
  "issues": [
    {
      "description": "Missing null check before accessing 'user.id'",
      "suggestion": "Add 'if (!user) return;' before accessing 'user.id'",
      "severity": "high"
    }
  ],
  "score": 4
}`
};

/**
 * Interface for LLM analysis response
 */
export interface LLMAnalysisResult {
  file: string;
  issues: ErrorHandlingIssue[];
  score: number; // 0-10 rating for error handling quality
}

/**
 * Interface for error handling issues
 */
export interface ErrorHandlingIssue {
  lineNumber?: number; // Approximate line number (if can be determined)
  description: string; // Description of the issue
  suggestion: string; // Suggestion for fixing the issue
  severity: 'low' | 'medium' | 'high'; // Severity of the issue
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
export class LLMService {
  private openai: OpenAI;
  private modelName: string;
  
  constructor(apiKey?: string, modelName?: string) {
    // If API key is not provided, try to get it from environment or input
    const key = apiKey || process.env.OPENAI_API_KEY || core.getInput('openai-api-key', { required: false });
    
    if (!key) {
      throw new Error('OpenAI API key is required. Set it as an environment variable or action input.');
    }
    
    this.openai = new OpenAI({
      apiKey: key
    });
    
    // Use the specified model or get from input, fallback to gpt-3.5-turbo
    this.modelName = modelName || process.env.LLM_MODEL || core.getInput('llm-model', { required: false }) || 'gpt-3.5-turbo';
    
    logger.info(`Using LLM model: ${this.modelName}`);
  }
  
  /**
   * Analyzes code for error handling issues by file
   * @param sections Array of added code sections to analyze
   * @returns Analysis results by file
   */
  async analyzeByFile(sections: AddedCodeSection[]): Promise<LLMAnalysisResult[]> {
    let filteredSections = sections;
    
    // Apply file filtering if enabled
    if (isFileFilteringEnabled()) {
      // Filter out sections from files that should be ignored
      filteredSections = sections.filter(section => !shouldIgnoreFile(section.file));
      
      // Log how many sections were ignored
      if (filteredSections.length < sections.length) {
        logger.info(`Skipping analysis for ${sections.length - filteredSections.length} sections from ignored file types`);
      }
    } else {
      logger.info('File type filtering is disabled. Analyzing all files.');
    }
    
    if (filteredSections.length === 0) {
      logger.info('No valid code sections to analyze after filtering');
      return [];
    }
    
    // Group sections by file
    const fileGroups = this.groupSectionsByFile(filteredSections);
    const results: LLMAnalysisResult[] = [];
    
    logger.debug(`Grouped ${filteredSections.length} sections into ${fileGroups.length} files for analysis`);
    
    // Analyze each file
    for (const fileGroup of fileGroups) {
      logger.debug(`Analyzing file: ${fileGroup.file} (${fileGroup.sections.length} sections)`);
      try {
        const result = await this.analyzeFileChanges(fileGroup);
        // Only add results with a score greater than 0 or with issues
        if (result.score > 0 || result.issues.length > 0) {
          results.push(result);
        } else {
          logger.info(`Skipping result for ${fileGroup.file} with no issues and score of 0`);
        }
      } catch (error) {
        if (error instanceof Error) {
          logger.warning(`Error analyzing file ${fileGroup.file}: ${error.message}`);
        } else {
          logger.warning(`Unknown error analyzing file ${fileGroup.file}`);
        }
        
        // We no longer add a default result with score 0 when there's an error
        logger.info(`Skipping result for ${fileGroup.file} due to analysis error`);
      }
    }
    
    return results;
  }
  
  /**
   * Groups sections by file path
   * @param sections Array of code sections
   * @returns Array of file groups
   */
  private groupSectionsByFile(sections: AddedCodeSection[]): FileChanges[] {
    const fileMap = new Map<string, AddedCodeSection[]>();
    
    // Group sections by file
    for (const section of sections) {
      if (!fileMap.has(section.file)) {
        fileMap.set(section.file, []);
      }
      fileMap.get(section.file)!.push(section);
    }
    
    // Convert map to array
    const result: FileChanges[] = [];
    fileMap.forEach((sections, file) => {
      result.push({ file, sections });
    });
    
    return result;
  }
  
  /**
   * Analyzes all changes in a file
   * @param fileChanges File and its changed sections
   * @returns Analysis result with issues and score
   */
  private async analyzeFileChanges(fileChanges: FileChanges): Promise<LLMAnalysisResult> {
    // Prepare the combined changed sections
    const sections = fileChanges.sections.map((section, index) => {
      return {
        index: index + 1,
        isModification: section.isModification || false,
        contextBefore: section.context.linesBefore.join('\n'),
        code: section.addedLines.join('\n'),
        contextAfter: section.context.linesAfter.join('\n')
      };
    });
    
    // Create the prompt for the LLM that includes all sections
    const prompt = this.createFileAnalysisPrompt(fileChanges.file, sections);
    
    // Basic message configuration
    const messages = [
      {
        role: "system" as const,
        content: "You are a code analysis assistant specialized in identifying error handling issues in code. Your goal is to find places where the code lacks proper error handling or has potential issues. Provide analysis in a structured JSON format."
      },
      {
        role: "user" as const,
        content: prompt
      }
    ];
    
    // Check if the model supports JSON response format
    const supportsJsonFormat = this.modelName.includes('gpt-4-turbo') || 
                               this.modelName.includes('gpt-3.5-turbo') || 
                               this.modelName.includes('gpt-4-0125');
    
    // Call the LLM API with appropriate parameters
    const response = await this.openai.chat.completions.create({
      model: this.modelName,
      messages: messages,
      temperature: 0.2, // Lower temperature for more deterministic results
      ...(supportsJsonFormat ? { response_format: { type: "json_object" } } : {})
    });
    
    // Parse the LLM response
    const content = response.choices[0]?.message?.content || '{"issues":[], "score": 0}';
    
    // Try to parse as JSON
    let result: { issues: ErrorHandlingIssue[], score: number };
    try {
      // Look for JSON in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;
      result = JSON.parse(jsonString) as { issues: ErrorHandlingIssue[], score: number };
    } catch (error) {
      logger.warning('Failed to parse LLM response as JSON. Using empty result.');
      logger.debug(`Response content: ${content}`);
      result = { issues: [], score: 0 };
    }
    
    // Return the structured analysis result
    return {
      file: fileChanges.file,
      issues: result.issues || [],
      score: result.issues && result.issues.length > 0 ? (result.score || 0) : (result.score > 0 ? result.score : 0)
    };
  }
  
  /**
   * Analyzes code for error handling issues (individual section)
   * @param section Added code section to analyze
   * @returns Analysis result with issues and score
   */
  async analyzeErrorHandling(section: AddedCodeSection): Promise<LLMAnalysisResult> {
    try {
      // Prepare the context and added code for analysis
      const contextBefore = section.context.linesBefore.join('\n');
      const code = section.addedLines.join('\n');
      const contextAfter = section.context.linesAfter.join('\n');
      
      // Create the prompt for the LLM
      const prompt = this.createAnalysisPrompt(section.file, contextBefore, code, contextAfter);
      
      // Basic message configuration
      const messages = [
        {
          role: "system" as const,
          content: "You are a code analysis assistant specialized in identifying error handling issues in code. Your goal is to find places where the code lacks proper error handling or has potential issues. Provide analysis in a structured JSON format."
        },
        {
          role: "user" as const,
          content: prompt
        }
      ];
      
      // Check if the model supports JSON response format
      const supportsJsonFormat = this.modelName.includes('gpt-4-turbo') || 
                                  this.modelName.includes('gpt-3.5-turbo') || 
                                  this.modelName.includes('gpt-4-0125');
      
      // Call the LLM API with appropriate parameters
      const response = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: messages,
        temperature: 0.2, // Lower temperature for more deterministic results
        ...(supportsJsonFormat ? { response_format: { type: "json_object" } } : {})
      });
      
      // Parse the LLM response
      const content = response.choices[0]?.message?.content || '{"issues":[], "score": 0}';
      
      // Try to parse as JSON
      let result: { issues: ErrorHandlingIssue[], score: number };
      try {
        // Look for JSON in the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : content;
        result = JSON.parse(jsonString) as { issues: ErrorHandlingIssue[], score: number };
      } catch (error) {
        logger.warning('Failed to parse LLM response as JSON. Using empty result.');
        logger.debug(`Response content: ${content}`);
        result = { issues: [], score: 0 };
      }
      
      // Return the structured analysis result
      return {
        file: section.file,
        issues: result.issues || [],
        score: result.issues && result.issues.length > 0 ? (result.score || 0) : (result.score > 0 ? result.score : 0)
      };
    } catch (error) {
      if (error instanceof Error) {
        logger.warning(`Error analyzing code with LLM: ${error.message}`);
      } else {
        logger.warning('Unknown error occurred during LLM analysis');
      }
      
      // Return null or empty on error instead of a default result
      logger.info(`Skipping result for ${section.file} due to analysis error`);
      return {
        file: section.file,
        issues: [],
        score: 0
      };
    }
  }
  
  /**
   * Creates a structured prompt for analyzing multiple sections in a file
   */
  private createFileAnalysisPrompt(fileName: string, sections: {index: number, isModification: boolean, contextBefore: string, code: string, contextAfter: string}[]): string {
    return `
Analyze the following file for error handling issues in the added code:

FILE: ${fileName}

${sections.map(section => `
SECTION ${section.index} (${section.isModification ? 'MODIFICATION' : 'NEW CODE'}):

CONTEXT BEFORE:
\`\`\`
${section.contextBefore}
\`\`\`

ADDED CODE TO ANALYZE:
\`\`\`
${section.code}
\`\`\`

CONTEXT AFTER:
\`\`\`
${section.contextAfter}
\`\`\`
`).join('\n')}

${LLM_PROMPTS.ERROR_ANALYSIS_INSTRUCTION}
${LLM_PROMPTS.ERROR_HANDLING_PATTERNS}

${LLM_PROMPTS.JSON_RESPONSE_FORMAT}
`;
  }
  
  /**
   * Creates a structured prompt for the LLM to analyze code
   */
  private createAnalysisPrompt(fileName: string, contextBefore: string, code: string, contextAfter: string): string {
    return `
Analyze the following code for error handling issues:

FILE: ${fileName}

CONTEXT BEFORE:
\`\`\`
${contextBefore}
\`\`\`

ADDED CODE TO ANALYZE:
\`\`\`
${code}
\`\`\`

CONTEXT AFTER:
\`\`\`
${contextAfter}
\`\`\`

${LLM_PROMPTS.ERROR_ANALYSIS_INSTRUCTION}
${LLM_PROMPTS.ERROR_HANDLING_PATTERNS}

${LLM_PROMPTS.JSON_RESPONSE_FORMAT}
`;
  }
} 