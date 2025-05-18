#!/bin/bash

# Log environment info
echo "Running GitHub Error Checking action"
echo "Node version: $(node -v)"
echo "Working directory: $(pwd)"

# Execute the action with environment variables
echo "Setting up GitHub Actions environment variables"
export GITHUB_TOKEN="${INPUT_GITHUB_TOKEN}"
export ERROR_TYPES="${INPUT_ERROR_TYPES}"
export IS_GITHUB_ACTION="true"

# Run the action
node ./dist/index.js 