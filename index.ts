/**
 * Local test runner for the GitHub Action
 * This allows testing the action without having to create a PR
 */
import * as fs from 'fs';
import * as path from 'path';
import { parseAddedLines, AddedCodeSection } from './src/diff-utils';

async function main(): Promise<void> {
  // Check if a diff file was provided
  const diffPath = process.argv[2];
  if (!diffPath) {
    console.error('Please provide a path to a diff file');
    console.error('Usage: node index.js <diff-file>');
    process.exit(1);
  }

  try {
    // Read the diff file
    const diff = fs.readFileSync(path.resolve(diffPath), 'utf8');
    
    // Parse the diff to get added lines
    const addedCode = parseAddedLines(diff);
    
    console.log(`Found ${addedCode.length} sections of added code\n`);
    
    // Print each section
    addedCode.forEach((section: AddedCodeSection, index: number) => {
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
          // Check if this is a deleted line (from modifications)
          if (line.startsWith('- ')) {
            console.log(`\x1b[31m- ${line.substring(2)}\x1b[0m`); // Red for deleted lines
          } else {
            console.log(`  ${line}`);
          }
        });
      }
      
      console.log('Added Code:');
      section.addedLines.forEach(line => console.log(`\x1b[32m+ ${line}\x1b[0m`)); // Green for added lines
      
      console.log('Context After:');
      if (section.context.linesAfter.length === 0) {
        console.log('  (none)');
      } else {
        section.context.linesAfter.forEach(line => console.log(`  ${line}`));
      }
      
      console.log('\n');
    });
    
    // Next step would be to analyze the added code with an LLM
    console.log('Next step: Analyze with LLM and provide suggestions for error handling');
    
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('Unknown error occurred');
    }
    process.exit(1);
  }
}

// Run the script
main(); 