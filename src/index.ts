import * as core from '@actions/core';
import * as github from '@actions/github';
import { getPullRequestDiff, parseAddedLines, AddedCodeSection } from './diff-utils';

async function run(): Promise<void> {
  try {
    // Check if we're running in GitHub Actions or local mode
    const isGitHubAction = process.env.IS_GITHUB_ACTION === 'true' || process.env.GITHUB_ACTIONS === 'true';
    console.log(`Running in GitHub Actions mode: ${isGitHubAction}`);
    
    // If running locally, expect a diff file path
    if (!isGitHubAction) {
      const diffPath = process.argv[2];
      if (!diffPath) {
        console.error('Please provide a path to a diff file');
        console.error('Usage: node index.js <diff-file>');
        process.exit(1);
      }
      
      const fs = require('fs');
      const path = require('path');
      const diff = fs.readFileSync(path.resolve(diffPath), 'utf8');
      const addedCode = parseAddedLines(diff);
      
      console.log(`Found ${addedCode.length} sections of added code`);
      return;
    }
    
    // GitHub Actions mode - get inputs from the action
    const token = core.getInput('github-token', { required: true });
    const errorTypes = core.getInput('error-types').split(',');
    
    const context = github.context;
    const octokit = github.getOctokit(token);
    
    // Check if this is a pull request
    if (context.eventName !== 'pull_request') {
      core.info('This action only works on pull requests.');
      return;
    }
    
    const pullNumber = context.payload.pull_request?.number;
    if (!pullNumber) {
      core.setFailed('Could not get pull request number from context');
      return;
    }
    
    const repo = context.repo;
    
    core.info(`Analyzing pull request #${pullNumber} in ${repo.owner}/${repo.repo}`);
    
    // Get PR diff
    const diff = await getPullRequestDiff(octokit, repo, pullNumber);
    
    // Parse diff to get added lines with file context
    const addedCode = parseAddedLines(diff);
    
    // Output the added code sections for further analysis
    core.setOutput('added-code', JSON.stringify(addedCode));
    
    // This will be replaced by LLM analysis in step 2
    core.info(`Found ${addedCode.length} sections of added code`);
    
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Action failed with error: ${error.message}`);
    } else {
      core.setFailed(`Action failed with unknown error`);
    }
  }
}

run(); 