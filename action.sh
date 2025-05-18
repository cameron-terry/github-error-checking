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

# Create a temporary directory for test files
TEMP_DIR=$(mktemp -d)
TEMP_EVENT_PATH="${TEMP_DIR}/event.json"

# If running in GitHub Actions with an event file, use it
if [ -f "$GITHUB_EVENT_PATH" ]; then
  echo "Found event file at $GITHUB_EVENT_PATH"
  SAMPLE_EVENT_PATH="$GITHUB_EVENT_PATH"
# Otherwise, create a fake event with axios.diff contents
else
  echo "Creating test event from axios.diff sample"
  SAMPLE_DIFF_PATH="samples/axios.diff"
  
  if [ -f "$SAMPLE_DIFF_PATH" ]; then
    # Read the diff contents
    DIFF_CONTENT=$(cat "$SAMPLE_DIFF_PATH")
    
    # Escape quotes and newlines for JSON
    ESCAPED_DIFF=$(echo "$DIFF_CONTENT" | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')
    
    # Create a JSON event object with the diff
    cat > "$TEMP_EVENT_PATH" << EOF
{
  "action": "opened",
  "pull_request": {
    "number": 123,
    "diff": "${ESCAPED_DIFF}"
  },
  "repository": {
    "owner": {
      "login": "test-owner"
    },
    "name": "test-repo"
  }
}
EOF
    
    echo "Created test event at $TEMP_EVENT_PATH"
    SAMPLE_EVENT_PATH="$TEMP_EVENT_PATH"
  else
    echo "Could not find sample diff file at $SAMPLE_DIFF_PATH"
    exit 1
  fi
fi

# Run the action with the event path
node ./dist/index.js "$SAMPLE_EVENT_PATH"

# Clean up temp files if we created them
if [ "$SAMPLE_EVENT_PATH" = "$TEMP_EVENT_PATH" ]; then
  rm -rf "$TEMP_DIR"
fi 