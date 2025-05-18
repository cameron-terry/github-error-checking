import * as core from '@actions/core';
import * as github from '@actions/github';
import { getPullRequestDiff, parseAddedLines, AddedCodeSection } from './diff-utils';

async function run(): Promise<void> {
  try {
    // Get inputs
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