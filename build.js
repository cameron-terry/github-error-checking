const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure lib and dist directories exist
const libDir = path.join(__dirname, 'lib');
const distDir = path.join(__dirname, 'dist');

try {
  if (!fs.existsSync(libDir)) {
    try {
      fs.mkdirSync(libDir);
    } catch (dirErr) {
      console.error(`Failed to create lib directory: ${dirErr.message}`);
      process.exit(1);
    }
  }

  if (!fs.existsSync(distDir)) {
    try {
      fs.mkdirSync(distDir);
    } catch (dirErr) {
      console.error(`Failed to create dist directory: ${dirErr.message}`);
      process.exit(1);
    }
  }

  // Run the build
  console.log('Building TypeScript code...');
  try {
    execSync('npx tsc', { stdio: 'inherit' });
    console.log('TypeScript compilation completed successfully!');
    
    console.log('Building for production with ncc...');
    execSync('npx @vercel/ncc build lib/src/index.js -o dist', { stdio: 'inherit' });
    console.log('ncc build completed successfully!');

    console.log('Build completed successfully!');
  } catch (buildErr) {
    console.error('Build command failed:', buildErr.message);
    process.exit(1);
  }
} catch (error) {
  console.error('Build process failed:', error.message);
  process.exit(1);
} 