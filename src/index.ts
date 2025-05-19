import * as core from '@actions/core';
import * as github from '@actions/github';
import * as fs from 'fs';
import * as path from 'path';
import { getPullRequestDiff, parseAddedLines } from './diff-utils';
import { LLMService, LLMAnalysisResult } from './llm-service';
import { logger, LogLevel } from './logger';
import { shouldIgnoreFile, isFileFilteringEnabled } from './file-filters';
import { validateAllInputs, validateRequiredInput } from './validate-inputs';
import { Octokit } from '@octokit/rest';

async function run(): Promise<void> {
  try {
    // Set logging level from input or default to INFO
    const logLevelInput = core.getInput('log-level', { required: false }) || 'info';
    const envLogLevel = process.env.LOG_LEVEL;
    
    // Environment variable takes precedence over input
    if (!envLogLevel) {
      logger.setLogLevel(logLevelInput);
    }
    
    logger.debug(`Log level: ${logger.getLogLevel()}`);
    
    // Check if a file path is provided as a command-line argument
    const diffPath = process.argv[2];
    
    // If not in local file mode, validate all action inputs
    if (!diffPath) {
      logger.debug('Validating action inputs...');
      if (!validateAllInputs()) {
        logger.warning('Some inputs failed validation. Attempting to continue with default values.');
      }
    } else {
      // In local file mode, we only need to ensure the OpenAI API key is present
      // if we want to use LLM analysis
      if (process.env.OPENAI_API_KEY) {
        logger.debug('OpenAI API key found in environment.');
      } else {
        logger.warning('No OpenAI API key found in environment. LLM analysis will be skipped.');
      }
    }
    
    let diff: string;
    
    if (diffPath) {
      // Local mode: Read diff from file
      logger.info(`Reading diff from file: ${diffPath}`);
      diff = fs.readFileSync(path.resolve(diffPath), 'utf8');
    } else {
      // GitHub Actions mode
      let token = '';
      
      try {
        // Try to get token from env or input
        token = process.env.GITHUB_TOKEN || // Direct env var
               process.env.INPUT_GITHUB_TOKEN || // GitHub Actions env convention
               core.getInput('github-token', { required: false }); // GitHub Actions getInput
      } catch (error) {
        logger.warning('Failed to get github-token from inputs, using mock token for testing');
      }
      
      // If no token is available, use a mock token for testing
      if (!token) {
        token = 'mock-token-for-testing';
        logger.warning('Using mock token for testing. This will limit functionality.');
      }
      
      const context = github.context;
      
      if (context.eventName !== 'pull_request') {
        logger.info('This action is designed to work on pull requests');
        logger.info('Since we are not running on a PR, using sample diff for testing');
        
        try {
          // Use a sample diff file if we're not in a PR context
          const sampleDiffPath = path.join(__dirname, '..', '..', 'samples', 'axios.diff');
          if (fs.existsSync(sampleDiffPath)) {
            try {
              diff = fs.readFileSync(sampleDiffPath, 'utf8');
              logger.info(`Using sample diff from ${sampleDiffPath} for testing`);
            } catch (readErr) {
              logger.warning(`Failed to read sample diff file: ${readErr instanceof Error ? readErr.message : 'Unknown error'}`);
              // Fall back to minimal diff
              diff = getMinimalSampleDiff();
            }
          } else {
            // Small sample diff for testing
            logger.info('Sample diff file not found, using inline sample diff');
            diff = getMinimalSampleDiff();
          }
        } catch (error) {
          logger.warning(`Error accessing sample diff: ${error instanceof Error ? error.message : 'Unknown error'}`);
          diff = getMinimalSampleDiff();
        }
      } else {
        // This is a real PR, get the pull number
        const pullNumber = context.payload.pull_request?.number;
        if (!pullNumber) {
          core.setFailed('Could not get pull request number from context');
          return;
        }
        
        const repo = context.repo;
        logger.info(`Analyzing pull request #${pullNumber} in ${repo.owner}/${repo.repo}`);
        
        const octokit = github.getOctokit(token);
        
        // If we're running in GitHub Actions, we need to handle rate limiting and retries
        logger.info('Fetching PR diff from GitHub API...');
        try {
          diff = await getPullRequestDiff(octokit as unknown as Octokit, repo, pullNumber);
          logger.info('Successfully fetched PR diff');
        } catch (error) {
          if (error instanceof Error) {
            core.setFailed(`Failed to fetch PR diff: ${error.message}`);
          } else {
            core.setFailed('Failed to fetch PR diff: Unknown error');
          }
          return;
        }
      }
    }
    
    // Parse the diff to find added code
    const addedCode = parseAddedLines(diff);
    
    // Output the results
    logger.info(`Found ${addedCode.length} sections of added code`);
    
    // Check if file filtering is enabled
    if (isFileFilteringEnabled()) {
      // Count the number of sections that would be ignored based on file type
      const ignoredSections = addedCode.filter(section => shouldIgnoreFile(section.file));
      if (ignoredSections.length > 0) {
        logger.info(`${ignoredSections.length} sections are from file types that will be ignored during analysis`);
        logger.debug('Ignored files:');
        new Set(ignoredSections.map(section => section.file)).forEach(file => 
          logger.debug(`  - ${file}`)
        );
      }
    } else {
      logger.info('File type filtering is disabled. All files will be analyzed.');
    }
    
    // Set output if running in GitHub Actions
    if (!diffPath) {
      core.setOutput('added-code', addedCode.length.toString());
    }
    
    // Initialize LLM service for code analysis
    const apiKey = process.env.OPENAI_API_KEY || core.getInput('openai-api-key', { required: !diffPath });
    const modelName = process.env.LLM_MODEL || core.getInput('llm-model') || 'gpt-4';
    
    let llmService: LLMService | null = null;
    
    try {
      if (apiKey) {
        try {
          llmService = new LLMService(apiKey, modelName);
        } catch (llmErr) {
          logger.warning(`Failed to initialize LLM service: ${llmErr instanceof Error ? llmErr.message : 'Unknown error'}`);
        }
      } else {
        logger.warning('No OpenAI API key provided. LLM analysis will be skipped.');
      }
    } catch (error) {
      logger.warning(`Error during LLM setup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Array to store analysis results
    const analysisResults: LLMAnalysisResult[] = [];
    let totalScore = 0;
    
    // Display each section found
    for (let index = 0; index < addedCode.length; index++) {
      const section = addedCode[index];
      logger.debug(`Section ${index + 1}:`);
      logger.debug(`File: ${section.file}`);
      logger.debug(`Added Lines: ${section.addedLines.length}`);
      
      if (section.isModification) {
        logger.debug(`Type: Modification to existing code`);
      } else {
        logger.debug(`Type: New code block`);
      }
      
      logger.debug('Context Before:');
      if (section.context.linesBefore.length === 0) {
        logger.debug('  (none)');
      } else {
        section.context.linesBefore.forEach(line => logger.debug(`  ${line}`));
      }
      
      logger.debug('Added Code:');
      section.addedLines.forEach(line => logger.debug(`+ ${line}`));
      
      logger.debug('Context After:');
      if (section.context.linesAfter.length === 0) {
        logger.debug('  (none)');
      } else {
        section.context.linesAfter.forEach(line => logger.debug(`  ${line}`));
      }
    }
    
    // Analyze using LLM if service is available
    if (llmService) {
      logger.info('Analyzing code with LLM by file...');
      try {
        // Use the new file-based analysis approach
        const fileResults = await llmService.analyzeByFile(addedCode);
        
        // Process and display each file's results
        for (const result of fileResults) {
          // Only process results with non-zero scores or issues
          if (result.score > 0 || result.issues.length > 0) {
            analysisResults.push(result);
            totalScore += result.score;
            
            logger.info(`\nAnalysis Results for ${result.file} (Error Handling Quality Score: ${result.score}/10):`);
            
            if (result.issues.length === 0) {
              logger.info('No error handling issues found.');
            } else {
              logger.info(`Found ${result.issues.length} potential issues:`);
              
              result.issues.forEach((issue, i) => {
                logger.info(`\nIssue ${i + 1}:`);
                logger.info(`Severity: ${issue.severity}`);
                logger.info(`Description: ${issue.description}`);
                logger.info(`Suggestion: ${issue.suggestion}`);
                if (issue.lineNumber) {
                  logger.info(`Line: ~${issue.lineNumber}`);
                }
              });
            }
          } else {
            logger.info(`Skipping result for ${result.file} with no issues and score of 0`);
          }
        }
        
      } catch (error) {
        logger.warning(`Error performing LLM analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
        logger.debug(`Analysis error details: ${JSON.stringify(error)}`);
      }
    } else {
      logger.info('LLM analysis not available. Skipping code analysis.');
    }
    
    // Set outputs for GitHub Actions
    if (!diffPath && llmService && analysisResults.length > 0) {
      core.setOutput('analysis-results', JSON.stringify(analysisResults));
      const averageScore = totalScore / analysisResults.length;
      core.setOutput('error-score', averageScore.toFixed(2));
      
      logger.info(`Overall error handling score: ${averageScore.toFixed(2)}/10`);
    }
    
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Action failed with error: ${error.message}`);
      logger.error(`Action failed with error: ${error.message}`);
    } else {
      core.setFailed(`Action failed with unknown error`);
      logger.error(`Action failed with unknown error`);
    }
  }
}

// Helper function to provide minimal sample diff
function getMinimalSampleDiff(): string {
  return `diff --git a/test.js b/test.js
index 123..456 100644
--- a/test.js
+++ b/test.js
@@ -1,1 +1,2 @@
// Test file
+console.log('Hello world');`;
}

run(); 