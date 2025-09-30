#! env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const distDir = './dist';
const files = fs.readdirSync(distDir);
console.log("AAAA:12", distDir, files)
files.forEach(file => {
  if (file.match(/\.(AppImage|deb|rpm)$/) && !file.endsWith('.asc')) {
    const filePath = path.join(distDir, file);
    console.log("AAAA:12", filePath)
    try {
      // Create detached signature
      execSync(`gpg --detach-sign --armor "${filePath}"`, { stdio: 'inherit' });
      console.log(`Signed: ${file}`);
    } catch (error) {
      console.error(`Failed to sign ${file}:`, error);
    }
  }
});