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

# Determine which mode to run in
if [ "$USE_TEST_DIFF" = "true" ]; then
  echo "Test mode enabled: Using sample diff instead of real PR"
  SAMPLE_DIFF_PATH="samples/axios.diff"
  
  if [ -f "$SAMPLE_DIFF_PATH" ]; then
    echo "Running with sample diff file: $SAMPLE_DIFF_PATH"
    
    # In test mode, directly run our standalone test script
    # Pass through GitHub-specific environment variables
    node test-diff.js "$SAMPLE_DIFF_PATH"
    exit $?
  else
    echo "Could not find sample diff file at $SAMPLE_DIFF_PATH"
    exit 1
  fi
else
  # Regular GitHub Actions mode
  if [ -f "$GITHUB_EVENT_PATH" ]; then
    echo "Found event file at $GITHUB_EVENT_PATH"
    echo "Running action with GitHub event"
    node ./dist/index.js "$GITHUB_EVENT_PATH"
  else
    echo "No event file found, unable to proceed"
    exit 1
  fi
fi 