const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure lib and dist directories exist
const libDir = path.join(__dirname, 'lib');
const distDir = path.join(__dirname, 'dist');

if (!fs.existsSync(libDir)) {
  fs.mkdirSync(libDir);
}

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// Run the build
console.log('Building TypeScript code...');
try {
  execSync('npx tsc', { stdio: 'inherit' });
  console.log('TypeScript compilation completed successfully!');
  
  console.log('Building for production with ncc...');
  execSync('npx @vercel/ncc build lib/index.js -o dist', { stdio: 'inherit' });
  console.log('ncc build completed successfully!');

  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
} 