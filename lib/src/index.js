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
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const diff_utils_1 = require("./diff-utils");
const llm_service_1 = require("./llm-service");
async function run() {
    var _a;
    try {
        let diff;
        // Check if a file path is provided as a command-line argument
        const diffPath = process.argv[2];
        if (diffPath) {
            // Local mode: Read diff from file
            console.log(`Reading diff from file: ${diffPath}`);
            diff = fs.readFileSync(path.resolve(diffPath), 'utf8');
        }
        else {
            // GitHub Actions mode
            console.log('Running in GitHub Actions mode');
            let token = '';
            try {
                // Try to get token from env or input
                token = process.env.GITHUB_TOKEN || // Direct env var
                    process.env.INPUT_GITHUB_TOKEN || // GitHub Actions env convention
                    core.getInput('github-token', { required: false }); // GitHub Actions getInput
            }
            catch (error) {
                core.warning('Failed to get github-token from inputs, using mock token for testing');
            }
            // If no token is available, use a mock token for testing
            if (!token) {
                token = 'mock-token-for-testing';
                core.warning('Using mock token for testing. This will limit functionality.');
            }
            const context = github.context;
            if (context.eventName !== 'pull_request') {
                core.info('This action is designed to work on pull requests');
                core.info('Since we are not running on a PR, using sample diff for testing');
                try {
                    // Use a sample diff file if we're not in a PR context
                    const sampleDiffPath = path.join(__dirname, '..', '..', 'samples', 'axios.diff');
                    if (fs.existsSync(sampleDiffPath)) {
                        diff = fs.readFileSync(sampleDiffPath, 'utf8');
                        core.info(`Using sample diff from ${sampleDiffPath} for testing`);
                    }
                    else {
                        // Small sample diff for testing
                        diff = `diff --git a/src/sample.js b/src/sample.js
index 123456..789012 100644
--- a/src/sample.js
+++ b/src/sample.js
@@ -1,5 +1,6 @@
 const fs = require('fs');
 const path = require('path');
+const axios = require('axios');
 
 /**
  * Read a configuration file`;
                        core.info('Using inline sample diff for testing');
                    }
                }
                catch (error) {
                    core.warning('Failed to load sample diff, using minimal test diff');
                    diff = `diff --git a/test.js b/test.js
index 123..456 100644
--- a/test.js
+++ b/test.js
@@ -1,1 +1,2 @@
 // Test file
+console.log('Hello world');`;
                }
            }
            else {
                // This is a real PR, get the pull number
                const pullNumber = (_a = context.payload.pull_request) === null || _a === void 0 ? void 0 : _a.number;
                if (!pullNumber) {
                    core.setFailed('Could not get pull request number from context');
                    return;
                }
                const repo = context.repo;
                core.info(`Analyzing pull request #${pullNumber} in ${repo.owner}/${repo.repo}`);
                const octokit = github.getOctokit(token);
                // If we're running in GitHub Actions, we need to handle rate limiting and retries
                core.info('Fetching PR diff from GitHub API...');
                try {
                    diff = await (0, diff_utils_1.getPullRequestDiff)(octokit, repo, pullNumber);
                    core.info('Successfully fetched PR diff');
                }
                catch (error) {
                    if (error instanceof Error) {
                        core.setFailed(`Failed to fetch PR diff: ${error.message}`);
                    }
                    else {
                        core.setFailed('Failed to fetch PR diff: Unknown error');
                    }
                    return;
                }
            }
        }
        // Parse the diff to find added code
        const addedCode = (0, diff_utils_1.parseAddedLines)(diff);
        // Output the results
        console.log(`\nFound ${addedCode.length} sections of added code\n`);
        // Set output if running in GitHub Actions
        if (!diffPath) {
            core.setOutput('added-code', addedCode.length.toString());
        }
        // Initialize LLM service for code analysis
        const apiKey = process.env.OPENAI_API_KEY || core.getInput('openai-api-key', { required: !diffPath });
        const modelName = core.getInput('llm-model') || 'gpt-4';
        let llmService = null;
        try {
            if (apiKey) {
                llmService = new llm_service_1.LLMService(apiKey);
            }
        }
        catch (error) {
            if (error instanceof Error) {
                core.warning(`Failed to initialize LLM service: ${error.message}`);
            }
            else {
                core.warning('Unknown error initializing LLM service');
            }
        }
        // Array to store analysis results
        const analysisResults = [];
        let totalScore = 0;
        // Display each section found
        for (let index = 0; index < addedCode.length; index++) {
            const section = addedCode[index];
            console.log(`Section ${index + 1}:`);
            console.log(`File: ${section.file}`);
            console.log(`Added Lines: ${section.addedLines.length}`);
            if (section.isModification) {
                console.log(`Type: Modification to existing code`);
            }
            else {
                console.log(`Type: New code block`);
            }
            console.log('Context Before:');
            if (section.context.linesBefore.length === 0) {
                console.log('  (none)');
            }
            else {
                section.context.linesBefore.forEach(line => console.log(`  ${line}`));
            }
            console.log('Added Code:');
            section.addedLines.forEach(line => console.log(`+ ${line}`));
            console.log('Context After:');
            if (section.context.linesAfter.length === 0) {
                console.log('  (none)');
            }
            else {
                section.context.linesAfter.forEach(line => console.log(`  ${line}`));
            }
            console.log('\n');
        }
        // Analyze using LLM if service is available
        if (llmService) {
            console.log('\nAnalyzing code with LLM by file...');
            try {
                // Use the new file-based analysis approach
                const fileResults = await llmService.analyzeByFile(addedCode);
                // Process and display each file's results
                for (const result of fileResults) {
                    analysisResults.push(result);
                    totalScore += result.score;
                    console.log(`\nAnalysis Results for ${result.file} (Error Handling Quality Score: ${result.score}/10):`);
                    if (result.issues.length === 0) {
                        console.log('No error handling issues found.');
                    }
                    else {
                        console.log(`Found ${result.issues.length} potential issues:`);
                        result.issues.forEach((issue, i) => {
                            console.log(`\nIssue ${i + 1}:`);
                            console.log(`Severity: ${issue.severity}`);
                            console.log(`Description: ${issue.description}`);
                            console.log(`Suggestion: ${issue.suggestion}`);
                            if (issue.lineNumber) {
                                console.log(`Line: ~${issue.lineNumber}`);
                            }
                        });
                    }
                    console.log('\n');
                }
            }
            catch (error) {
                if (error instanceof Error) {
                    core.warning(`Error performing LLM analysis: ${error.message}`);
                }
                else {
                    core.warning('Unknown error during LLM analysis');
                }
            }
        }
        else {
            console.log('\nLLM analysis not available. Skipping code analysis.');
        }
        // Set outputs for GitHub Actions
        if (!diffPath && llmService && analysisResults.length > 0) {
            core.setOutput('analysis-results', JSON.stringify(analysisResults));
            const averageScore = totalScore / analysisResults.length;
            core.setOutput('error-score', averageScore.toFixed(2));
            console.log(`Overall error handling score: ${averageScore.toFixed(2)}/10`);
        }
    }
    catch (error) {
        if (error instanceof Error) {
            core.setFailed(`Action failed with error: ${error.message}`);
        }
        else {
            core.setFailed(`Action failed with unknown error`);
        }
    }
}
run();
//# sourceMappingURL=index.js.map