import * as core from '@actions/core';
import * as github from '@actions/github';
import * as fs from 'fs';
import * as path from 'path';
import { getPullRequestDiff, parseAddedLines } from './diff-utils';
import { LLMService, LLMAnalysisResult } from './llm-service';

async function run(): Promise<void> {
  try {
    let diff: string;
    
    // Check if a file path is provided as a command-line argument
    const diffPath = process.argv[2];
    
    if (diffPath) {
      // Local mode: Read diff from file
      console.log(`Reading diff from file: ${diffPath}`);
      diff = fs.readFileSync(path.resolve(diffPath), 'utf8');
    } else {
      // GitHub Actions mode
      console.log('Running in GitHub Actions mode');
      let token = '';
      
      try {
        // Try to get token from env or input
        token = process.env.GITHUB_TOKEN || // Direct env var
               process.env.INPUT_GITHUB_TOKEN || // GitHub Actions env convention
               core.getInput('github-token', { required: false }); // GitHub Actions getInput
      } catch (error) {
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
          } else {
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
        } catch (error) {
          core.warning('Failed to load sample diff, using minimal test diff');
          diff = `diff --git a/test.js b/test.js
index 123..456 100644
--- a/test.js
+++ b/test.js
@@ -1,1 +1,2 @@
 // Test file
+console.log('Hello world');`;
        }
      } else {
        // This is a real PR, get the pull number
        const pullNumber = context.payload.pull_request?.number;
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
          diff = await getPullRequestDiff(octokit, repo, pullNumber);
          core.info('Successfully fetched PR diff');
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
    console.log(`\nFound ${addedCode.length} sections of added code\n`);
    
    // Set output if running in GitHub Actions
    if (!diffPath) {
      core.setOutput('added-code', addedCode.length.toString());
    }
    
    // Initialize LLM service for code analysis
    const apiKey = process.env.OPENAI_API_KEY || core.getInput('openai-api-key', { required: !diffPath });
    const modelName = core.getInput('llm-model') || 'gpt-4';
    
    let llmService: LLMService | null = null;
    
    try {
      if (apiKey) {
        llmService = new LLMService(apiKey);
      }
    } catch (error) {
      if (error instanceof Error) {
        core.warning(`Failed to initialize LLM service: ${error.message}`);
      } else {
        core.warning('Unknown error initializing LLM service');
      }
    }
    
    // Array to store analysis results
    const analysisResults: LLMAnalysisResult[] = [];
    let totalScore = 0;
    
    // Display each section and analyze with LLM if available
    for (let index = 0; index < addedCode.length; index++) {
      const section = addedCode[index];
      console.log(`Section ${index + 1}:`);
      console.log(`File: ${section.file}`);
      console.log(`Added Lines: ${section.addedLines.length}`);
      
      if (section.isModification) {
        console.log(`Type: Modification to existing code`);
      } else {
        console.log(`Type: New code block`);
      }
      
      console.log('Context Before:');
      if (section.context.linesBefore.length === 0) {
        console.log('  (none)');
      } else {
        section.context.linesBefore.forEach(line => console.log(`  ${line}`));
      }
      
      console.log('Added Code:');
      section.addedLines.forEach(line => console.log(`+ ${line}`));
      
      console.log('Context After:');
      if (section.context.linesAfter.length === 0) {
        console.log('  (none)');
      } else {
        section.context.linesAfter.forEach(line => console.log(`  ${line}`));
      }
      
      // Analyze with LLM if service is available
      if (llmService) {
        console.log('\nAnalyzing code with LLM...');
        try {
          const analysisResult = await llmService.analyzeErrorHandling(section);
          analysisResults.push(analysisResult);
          totalScore += analysisResult.score;
          
          // Display analysis results
          console.log(`\nAnalysis Results (Error Handling Quality Score: ${analysisResult.score}/10):`);
          
          if (analysisResult.issues.length === 0) {
            console.log('No error handling issues found.');
          } else {
            console.log(`Found ${analysisResult.issues.length} potential issues:`);
            
            analysisResult.issues.forEach((issue, i) => {
              console.log(`\nIssue ${i + 1}:`);
              console.log(`Severity: ${issue.severity}`);
              console.log(`Description: ${issue.description}`);
              console.log(`Suggestion: ${issue.suggestion}`);
              if (issue.lineNumber) {
                console.log(`Line: ~${issue.lineNumber}`);
              }
            });
          }
        } catch (error) {
          if (error instanceof Error) {
            console.log(`Error analyzing section: ${error.message}`);
          } else {
            console.log('Unknown error analyzing section');
          }
        }
      } else {
        console.log('\nLLM analysis not available. Skipping code analysis.');
      }
      
      console.log('\n');
    }
    
    // Set outputs for GitHub Actions
    if (!diffPath && llmService && analysisResults.length > 0) {
      core.setOutput('analysis-results', JSON.stringify(analysisResults));
      const averageScore = totalScore / analysisResults.length;
      core.setOutput('error-score', averageScore.toFixed(2));
      
      console.log(`Overall error handling score: ${averageScore.toFixed(2)}/10`);
    }
    
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Action failed with error: ${error.message}`);
    } else {
      core.setFailed(`Action failed with unknown error`);
    }
  }
}

run(); 