const fs = require('fs');
const path = require('path');
const { parseAddedLines } = require('./lib/src/diff-utils');

// Debug GitHub Actions environment
console.log('GitHub Actions Environment:');
console.log(`GITHUB_ACTIONS: ${process.env.GITHUB_ACTIONS}`);
console.log(`GITHUB_OUTPUT: ${process.env.GITHUB_OUTPUT}`);
console.log(`GITHUB_ENV: ${process.env.GITHUB_ENV}`);
console.log(`GITHUB_STEP_SUMMARY: ${process.env.GITHUB_STEP_SUMMARY}`);

// Read the sample diff file
const diffPath = process.argv[2] || 'samples/axios.diff';
console.log(`Reading diff from: ${diffPath}`);

// Check if file exists
if (!fs.existsSync(diffPath)) {
  console.error(`Error: File ${diffPath} does not exist`);
  process.exit(1);
}

// Read the diff content
const diff = fs.readFileSync(path.resolve(diffPath), 'utf8');
console.log(`Diff length: ${diff.length} characters`);
console.log(`Diff preview: ${diff.substring(0, 100)}...`);

// Parse the diff
console.log('\nParsing diff...');
const addedCode = parseAddedLines(diff);

// Log the results
console.log(`\nFound ${addedCode.length} sections of added code\n`);

// Set GitHub Actions output if running in GitHub Actions
if (process.env.GITHUB_ACTIONS === 'true') {
  console.log('Setting GitHub Actions outputs...');
  
  // Check if GITHUB_OUTPUT is available (newer GitHub Actions)
  if (process.env.GITHUB_OUTPUT) {
    try {
      console.log(`Writing to GITHUB_OUTPUT file: ${process.env.GITHUB_OUTPUT}`);
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `added-code=${addedCode.length}\n`);
      console.log(`Output added-code=${addedCode.length} written to $GITHUB_OUTPUT`);
    } catch (error) {
      console.error(`Error writing to GITHUB_OUTPUT: ${error.message}`);
    }
  }
  
  // Always use the set-output command as fallback
  console.log('Using ::set-output:: command as fallback');
  console.log(`::set-output name=added-code::${addedCode.length}`);
  
  // Try setting the output variable directly in the environment
  try {
    if (process.env.GITHUB_ENV) {
      console.log(`Writing to GITHUB_ENV file: ${process.env.GITHUB_ENV}`);
      fs.appendFileSync(process.env.GITHUB_ENV, `added_code=${addedCode.length}\n`);
      console.log(`Environment variable added_code=${addedCode.length} written to $GITHUB_ENV`);
    }
  } catch (error) {
    console.error(`Error writing to GITHUB_ENV: ${error.message}`);
  }
  
  // Also try writing to step summary
  try {
    if (process.env.GITHUB_STEP_SUMMARY) {
      console.log(`Writing to GITHUB_STEP_SUMMARY: ${process.env.GITHUB_STEP_SUMMARY}`);
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `# Analysis Results\n\nFound ${addedCode.length} sections of code to analyze.\n`);
    }
  } catch (error) {
    console.error(`Error writing to GITHUB_STEP_SUMMARY: ${error.message}`);
  }
}

if (addedCode.length > 0) {
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
      section.context.linesBefore.forEach(line => {
        console.log(`  ${line}`);
      });
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
}

// For GitHub Actions, explicitly write the result to stdout in a special format
if (process.env.GITHUB_ACTIONS === 'true') {
  console.log('GITHUB_ACTION_RESULT_JSON:{"added_code":' + addedCode.length + '}');
} 