#!/bin/bash

# Log environment info
echo "Running GitHub Error Checking action"
echo "Node version: $(node -v)"
echo "Working directory: $(pwd)"

# Execute the action
node ./dist/index.js 