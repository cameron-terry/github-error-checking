const fs = require('fs');
const path = require('path');
const { parseAddedLines } = require('./lib/src/diff-utils');

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