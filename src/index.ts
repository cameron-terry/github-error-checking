import * as core from '@actions/core';
import * as github from '@actions/github';
import * as fs from 'fs';
import * as path from 'path';
import { getPullRequestDiff, parseAddedLines } from './diff-utils';

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
      const token = core.getInput('github-token', { required: true });
      const context = github.context;
      
      if (context.eventName !== 'pull_request') {
        core.info('This action only works on pull requests');
        return;
      }
      
      const pullNumber = context.payload.pull_request?.number;
      if (!pullNumber) {
        core.setFailed('Could not get pull request number from context');
        return;
      }
      
      const repo = context.repo;
      core.info(`Analyzing pull request #${pullNumber} in ${repo.owner}/${repo.repo}`);
      
      const octokit = github.getOctokit(token);
      diff = await getPullRequestDiff(octokit, repo, pullNumber);
    }
    
    // Parse the diff to find added code
    const addedCode = parseAddedLines(diff);
    
    // Output the results
    console.log(`\nFound ${addedCode.length} sections of added code\n`);
    
    // Set output if running in GitHub Actions
    if (!diffPath) {
      core.setOutput('added-code', addedCode.length.toString());
    }
    
    // Display each section
    addedCode.forEach((section, index) => {
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
      
      console.log('\n');
    });
    
    console.log('Next step: Analyze with LLM and provide suggestions for error handling');
    
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Action failed with error: ${error.message}`);
    } else {
      core.setFailed(`Action failed with unknown error`);
    }
  }
}

run(); 