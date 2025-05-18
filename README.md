# GitHub Error Checking

A GitHub Actions tool that analyzes pull requests for proper error handling in added code.

This branch is the main branch. All development should be done in feature branches and merged via pull requests.

## How It Works

1. **Identification**: Automatically identifies lines of code that are added in a pull request
2. **Analysis**: Feeds the added code to an LLM Agent for analysis of error handling patterns
3. **Suggestions**: Returns suggestions for improving error handling in the code

## Purpose

This tool helps developers ensure that new code includes proper error handling before it gets merged, reducing the likelihood of production issues caused by unhandled exceptions.

## Installation

To use this GitHub Action in your repository:

1. Create a `.github/workflows/error-check.yml` file with the following content:

```yaml
name: Error Handling Check

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  check-error-handling:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Check for error handling
        uses: cameronterry/github-error-checking@v1
        id: error-check
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          
      - name: Report results
        run: echo "Found ${{ steps.error-check.outputs.added-code }} sections to analyze"
```

## Configuration

The action accepts the following inputs:

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `github-token` | GitHub token for API access | Yes | `${{ github.token }}` |
| `error-types` | Types of error handling to check for (comma-separated) | No | `exceptions,null-checks,undefined-checks` |

## Outputs

| Output | Description |
|--------|-------------|
| `added-code` | JSON array of added code sections with context |
| `suggestions` | Suggestions for improving error handling |

## Development

### Prerequisites

- Node.js 14 or later
- npm or yarn

### Setting up the development environment

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start TypeScript in watch mode during development:
   ```
   npm run dev
   ```
4. Build the project:
   ```
   npm run build
   ```
5. Run tests:
   ```
   npm test
   ```
6. Run linting:
   ```
   npm run lint
   ```
7. Type-check without emitting files:
   ```
   npm run typecheck
   ```

### Local Testing

You can test the diff parsing functionality locally without creating a real PR:

1. Use one of the sample diff files in the `samples/` directory
2. Run the local test runner:
   ```
   node lib/index.js samples/axios.diff
   ```
   or for a more complex example:
   ```
   node lib/index.js samples/user-order-services.diff
   ```

This will show you the added code sections that would be analyzed in a real PR.

See the [samples/README.md](samples/README.md) for more information about the sample files and the error handling issues they contain.

### Project Structure

- `src/index.ts` - Main entry point for the GitHub Action
- `src/diff-utils.ts` - Utilities for parsing PR diffs and extracting added code
- `tests/` - Test files
- `lib/` - Compiled JavaScript output from TypeScript
- `.github/workflows/` - GitHub workflows for testing the action
- `samples/` - Sample diff files for testing
- `index.ts` - Local test runner for development
- `.eslintrc.js` - ESLint configuration
- `jest.config.js` - Jest test configuration
- `tsconfig.json` - TypeScript configuration
- `build.js` - Script to compile the action using tsc and ncc

### Dependencies

- `@actions/core` and `@actions/github` - Core GitHub Actions libraries
- `parse-diff` - Library to parse git diff output
- TypeScript support: `typescript`, `@types/node`, `@types/jest`
- Development tools: Jest with `ts-jest`, ESLint with TypeScript plugins, `@vercel/ncc`

## Implementation Details

### Step 1: Identifying Added Code

The first step of the process identifies lines that have been added in a pull request:

1. Retrieves the PR diff using the GitHub API
2. Parses the diff to extract added lines of code
3. Maintains context (lines before and after) for proper analysis
4. Outputs structured data for further analysis
5. Differentiates between new code blocks and modifications to existing code

### Step 2: LLM Analysis (Coming Soon)

This step will analyze the added code for proper error handling patterns using LLM technology.

### Step 3: Suggestions (Coming Soon)

The final step will provide actionable suggestions for improving error handling.

## Type Safety

The project is fully typed with TypeScript, providing:

- Explicit interfaces for all data structures
- Type validation for GitHub API calls and responses
- Better IDE support with autocompletion and error detection
- More reliable code through compile-time type checking

## Status

🚧 Under Development 🚧

Currently implemented:
- Step 1: Identifying added lines of code in a PR
- Development environment with local testing capability
- Sample diff files with various error handling patterns
- Complete TypeScript conversion for type safety 