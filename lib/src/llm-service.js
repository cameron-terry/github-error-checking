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
exports.LLMService = void 0;
/**
 * LLM Service for analyzing code error handling patterns
 */
const openai_1 = require("openai");
const core = __importStar(require("@actions/core"));
const logger_1 = require("./logger");
const file_filters_1 = require("./file-filters");
/**
 * Constants for LLM prompts
 */
const LLM_PROMPTS = {
    ERROR_ANALYSIS_INSTRUCTION: 'Identify any missing or improper error handling in the ADDED CODE section only.',
    ERROR_HANDLING_PATTERNS: `Consider these error handling patterns:
1. Exception handling (try/catch blocks or unhandled async errors)
2. Null/undefined checks
3. Error propagation
4. Input validation
5. Edge cases (e.g. empty inputs, extreme values, unexpected types, empty arrays/objects)
6. Resource cleanup`,
    JSON_RESPONSE_FORMAT: `Analyze only the ADDED CODE section for missing or improper error handling. Do NOT evaluate unchanged code or suggest general improvements.

Focus only on the following error handling concerns:
1. Missing exception handling (e.g. try/catch or guard clauses) 
2. Missing null/undefined checks
3. Improper error propagation (e.g. swallowing errors)
4. Lack of input validation
5. Missing edge case checks
6. Missing cleanup of open resources (e.g. file handles, DB connections)

Watch for APIs that can return null (e.g. array.find, regex.match, DOM accessors).
Only report issues if they are *highly likely to cause real bugs, runtime errors, or maintenance problems*. Do not speculate or infer issues unless based on specific evidence in the code.

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
 * Class to handle LLM services for code analysis
 */
class LLMService {
    constructor(apiKey, modelName) {
        // If API key is not provided, try to get it from environment or input
        const key = apiKey || process.env.OPENAI_API_KEY || core.getInput('openai-api-key', { required: false });
        if (!key) {
            throw new Error('OpenAI API key is required. Set it as an environment variable or action input.');
        }
        this.openai = new openai_1.OpenAI({
            apiKey: key
        });
        // Use the specified model or get from input, fallback to gpt-3.5-turbo
        this.modelName = modelName || process.env.LLM_MODEL || core.getInput('llm-model', { required: false }) || 'gpt-3.5-turbo';
        logger_1.logger.info(`Using LLM model: ${this.modelName}`);
    }
    /**
     * Analyzes code for error handling issues by file
     * @param sections Array of added code sections to analyze
     * @returns Analysis results by file
     */
    async analyzeByFile(sections) {
        let filteredSections = sections;
        // Apply file filtering if enabled
        if ((0, file_filters_1.isFileFilteringEnabled)()) {
            // Filter out sections from files that should be ignored
            filteredSections = sections.filter(section => !(0, file_filters_1.shouldIgnoreFile)(section.file));
            // Log how many sections were ignored
            if (filteredSections.length < sections.length) {
                logger_1.logger.info(`Skipping analysis for ${sections.length - filteredSections.length} sections from ignored file types`);
            }
        }
        else {
            logger_1.logger.info('File type filtering is disabled. Analyzing all files.');
        }
        if (filteredSections.length === 0) {
            logger_1.logger.info('No valid code sections to analyze after filtering');
            return [];
        }
        // Group sections by file
        const fileGroups = this.groupSectionsByFile(filteredSections);
        const results = [];
        logger_1.logger.debug(`Grouped ${filteredSections.length} sections into ${fileGroups.length} files for analysis`);
        // Analyze each file
        for (const fileGroup of fileGroups) {
            logger_1.logger.debug(`Analyzing file: ${fileGroup.file} (${fileGroup.sections.length} sections)`);
            try {
                const result = await this.analyzeFileChanges(fileGroup);
                // Only add results with a score greater than 0 or with issues
                if (result.score > 0 || result.issues.length > 0) {
                    results.push(result);
                }
                else {
                    logger_1.logger.info(`Skipping result for ${fileGroup.file} with no issues and score of 0`);
                }
            }
            catch (error) {
                if (error instanceof Error) {
                    logger_1.logger.warning(`Error analyzing file ${fileGroup.file}: ${error.message}`);
                }
                else {
                    logger_1.logger.warning(`Unknown error analyzing file ${fileGroup.file}`);
                }
                // We no longer add a default result with score 0 when there's an error
                logger_1.logger.info(`Skipping result for ${fileGroup.file} due to analysis error`);
            }
        }
        return results;
    }
    /**
     * Groups sections by file path
     * @param sections Array of code sections
     * @returns Array of file groups
     */
    groupSectionsByFile(sections) {
        var _a;
        const fileMap = new Map();
        // Group sections by file
        for (const section of sections) {
            if (!fileMap.has(section.file)) {
                fileMap.set(section.file, []);
            }
            (_a = fileMap.get(section.file)) === null || _a === void 0 ? void 0 : _a.push(section);
        }
        // Convert map to array
        const result = [];
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
    async analyzeFileChanges(fileChanges) {
        var _a, _b;
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
                role: 'system',
                content: 'You are a code analysis assistant specialized in identifying error handling issues in code. Your goal is to find places where the code lacks proper error handling or has potential issues. Provide analysis in a structured JSON format.'
            },
            {
                role: 'user',
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
            ...(supportsJsonFormat ? { response_format: { type: 'json_object' } } : {})
        });
        // Parse the LLM response
        const content = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || '{"issues":[], "score": 0}';
        // Try to parse as JSON
        let result;
        try {
            // Look for JSON in the response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[0] : content;
            result = JSON.parse(jsonString);
        }
        catch (error) {
            logger_1.logger.warning('Failed to parse LLM response as JSON. Using empty result.');
            logger_1.logger.debug(`Response content: ${content}`);
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
    async analyzeErrorHandling(section) {
        var _a, _b;
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
                    role: 'system',
                    content: 'You are a code analysis assistant specialized in identifying error handling issues in code. Your goal is to find places where the code lacks proper error handling or has potential issues. Provide analysis in a structured JSON format.'
                },
                {
                    role: 'user',
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
                ...(supportsJsonFormat ? { response_format: { type: 'json_object' } } : {})
            });
            // Parse the LLM response
            const content = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || '{"issues":[], "score": 0}';
            // Try to parse as JSON
            let result;
            try {
                // Look for JSON in the response
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                const jsonString = jsonMatch ? jsonMatch[0] : content;
                result = JSON.parse(jsonString);
            }
            catch (error) {
                logger_1.logger.warning('Failed to parse LLM response as JSON. Using empty result.');
                logger_1.logger.debug(`Response content: ${content}`);
                result = { issues: [], score: 0 };
            }
            // Return the structured analysis result
            return {
                file: section.file,
                issues: result.issues || [],
                score: result.issues && result.issues.length > 0 ? (result.score || 0) : (result.score > 0 ? result.score : 0)
            };
        }
        catch (error) {
            if (error instanceof Error) {
                logger_1.logger.warning(`Error analyzing code with LLM: ${error.message}`);
            }
            else {
                logger_1.logger.warning('Unknown error occurred during LLM analysis');
            }
            // Return null or empty on error instead of a default result
            logger_1.logger.info(`Skipping result for ${section.file} due to analysis error`);
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
    createFileAnalysisPrompt(fileName, sections) {
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
    createAnalysisPrompt(fileName, contextBefore, code, contextAfter) {
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
exports.LLMService = LLMService;
//# sourceMappingURL=llm-service.js.map