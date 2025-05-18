/**
 * Test script for the bundled GitHub Action
 * This script directly invokes the built action to verify it works correctly
 */
const path = require('path');
const fs = require('fs');

// Wrap our execution in an async function
async function runTest() {
  // Mock GitHub Actions core module
  const outputs = {};
  const mockCore = {
    getInput: (name, options) => {
      if (name === 'openai-api-key') {
        return process.env.OPENAI_API_KEY || '';
      }
      if (name === 'llm-model') {
        return process.env.LLM_MODEL || 'gpt-3.5-turbo';
      }
      if (name === 'github-token') {
        return 'mock-token';
      }
      return '';
    },
    setOutput: (name, value) => {
      outputs[name] = value;
      console.log(`Output "${name}": ${value}`);
    },
    setFailed: (message) => {
      console.error(`Action failed: ${message}`);
    },
    info: (message) => {
      console.log(`[INFO] ${message}`);
    },
    warning: (message) => {
      console.log(`[WARNING] ${message}`);
    }
  };

  // Mock GitHub context
  const mockGithub = {
    context: {
      eventName: 'pull_request',
      payload: {
        pull_request: {
          number: 123
        }
      },
      repo: {
        owner: 'cameronterry',
        repo: 'github-error-checking'
      }
    },
    getOctokit: () => ({
      pulls: {
        get: ({ owner, repo, pull_number, mediaType }) => {
          // Return mock diff data from the sample file
          const diffPath = process.argv[2] || path.resolve('./samples/axios.diff');
          const diffData = fs.readFileSync(diffPath, 'utf8');
          return { data: diffData };
        }
      }
    })
  };

  // Override the GitHub context
  process.env.GITHUB_EVENT_NAME = 'pull_request';

  // Mock process.argv to simulate providing a diff file
  const originalArgv = process.argv;
  process.argv = [
    process.argv[0],
    process.argv[1],
    path.resolve('./samples/axios.diff')
  ];

  // Override require for @actions/core and @actions/github to use our mocks
  const originalRequire = require;
  require = function(id) {
    if (id === '@actions/core') {
      return mockCore;
    }
    if (id === '@actions/github') {
      return mockGithub;
    }
    return originalRequire(id);
  };

  // Execute the action
  console.log('Testing bundled GitHub Action with LLM integration...');

  // Check if OpenAI API key is set
  if (!process.env.OPENAI_API_KEY) {
    console.log('\nNo OpenAI API key found. LLM analysis will be skipped.');
    console.log('To test with LLM, set OPENAI_API_KEY environment variable.\n');
  }

  try {
    // Import and run the action
    const actionModule = require('./dist/index.js');
    
    // Wait a bit to ensure all async operations complete
    await new Promise(resolve => setTimeout(resolve, 20000));
    
    console.log('\n========== Action Outputs ==========');
    console.log(JSON.stringify(outputs, null, 2));
    console.log('===================================');
  } catch (error) {
    console.error('Error executing action:', error);
  } finally {
    // Restore original argv and require
    process.argv = originalArgv;
    require = originalRequire;
  }
}

// Run the test
runTest().catch(error => {
  console.error('Error running test:', error);
}); 