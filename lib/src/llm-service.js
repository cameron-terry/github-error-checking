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
        console.log(`Using LLM model: ${this.modelName}`);
    }
    /**
     * Analyzes code for error handling issues
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
                    role: "system",
                    content: "You are a code analysis assistant specialized in identifying error handling issues in code. Your goal is to find places where the code lacks proper error handling or has potential issues. Provide analysis in a structured JSON format."
                },
                {
                    role: "user",
                    content: prompt
                }
            ];
            // Check if the model supports JSON response format
            // Currently, only gpt-4-turbo and gpt-3.5-turbo support this parameter
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
                console.log('Failed to parse LLM response as JSON. Using empty result.');
                console.log('Response content:', content);
                result = { issues: [], score: 0 };
            }
            // Return the structured analysis result
            return {
                file: section.file,
                issues: result.issues || [],
                score: result.score || 0
            };
        }
        catch (error) {
            if (error instanceof Error) {
                core.warning(`Error analyzing code with LLM: ${error.message}`);
            }
            else {
                core.warning('Unknown error occurred during LLM analysis');
            }
            // Return a default result in case of error
            return {
                file: section.file,
                issues: [],
                score: 0
            };
        }
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

Identify any missing or improper error handling in the ADDED CODE section only.
Consider these error handling patterns:
1. Exception handling (try/catch blocks)
2. Null/undefined checks
3. Error propagation
4. Input validation
5. Edge cases
6. Resource cleanup

Respond with a JSON object containing:
1. An "issues" array with objects containing:
   - description: Description of the issue
   - suggestion: Specific code suggestion to fix the issue
   - severity: "low", "medium", or "high" based on potential impact
   - lineNumber: Approximate line number in the added code section (optional)
2. A "score" from 0-10 rating the overall quality of error handling (0=poor, 10=excellent)

Example response format:
{
  "issues": [
    {
      "description": "Missing null check before accessing property",
      "suggestion": "Add 'if (user === null || user === undefined) { return; }' before accessing user properties",
      "severity": "high"
    }
  ],
  "score": 4
}
`;
    }
}
exports.LLMService = LLMService;
//# sourceMappingURL=llm-service.js.map