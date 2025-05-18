#!/bin/bash

# Log environment info
echo "Running GitHub Error Checking action"
echo "Node version: $(node -v)"
echo "Working directory: $(pwd)"

# Debug environment
echo "GITHUB_ACTIONS: ${GITHUB_ACTIONS}"
echo "GITHUB_EVENT_NAME: ${GITHUB_EVENT_NAME}"
echo "GITHUB_EVENT_PATH: ${GITHUB_EVENT_PATH}"

# Execute the action with environment variables
echo "Setting up GitHub Actions environment variables"
export GITHUB_TOKEN="${INPUT_GITHUB_TOKEN}"
export ERROR_TYPES="${INPUT_ERROR_TYPES}"
export IS_GITHUB_ACTION="true"

# Create a temporary file with the PR context if we're in a PR
if [ -f "$GITHUB_EVENT_PATH" ]; then
  echo "Found event file at $GITHUB_EVENT_PATH"
  # Pass the event path directly to node as an argument
  node ./dist/index.js "$GITHUB_EVENT_PATH"
else
  echo "No event file found, running without context"
  node ./dist/index.js
fi 