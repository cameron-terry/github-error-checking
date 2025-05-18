# Sample Diff Files

This directory contains sample diff files to test the GitHub Error Checking tool. Each file represents a different pull request scenario with various error handling issues.

## Available Samples

### axios.diff

A basic diff showing changes to a single file (`src/sample.js`), including:
- Adding a new dependency (axios)
- Adding new functions without proper error handling
- Modifying the module exports

**Error handling issues**:
- `fetchData` function doesn't handle network errors
- `processUserInput` doesn't check for null or undefined inputs

### user-order-services.diff

A more complex diff spanning multiple files with various potential undefined value issues:

**user-service.js changes**:
- Adds a cache dependency
- Adds new functions for user profile management and activity tracking
- Modifies module exports

**order-processor.js changes**:
- Adds user service integration
- Adds new functions for order processing with payment integration
- Updates module exports

**Error handling issues**:
- Nested property access without checks: `response.data.activity.login.timestamp`
- No validation before assigning properties: `user.preferences = preferences.data`
- Accessing potentially undefined properties: `user.defaultAddress`
- No validation for user ID before use
- Accessing configuration values without validation: `config.paymentProviders[paymentDetails.provider]`
- Missing error handling for API calls

## How to Use

Run the samples with the local test runner:

```bash
# Test basic axios sample
node index.js samples/axios.diff

# Test complex user and order services sample
node index.js samples/user-order-services.diff
```

The output will show detected code additions and modifications, which can then be analyzed for error handling issues in step 2 of the project. 