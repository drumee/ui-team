const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

function generateChecksum(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

const distDir = './dist';
const files = fs.readdirSync(distDir);

files.forEach(file => {
  if (file.endsWith('.AppImage') || file.endsWith('.deb') || file.endsWith('.rpm')) {
    const filePath = path.join(distDir, file);
    const checksum = generateChecksum(filePath);
    
    // Write checksum to file
    fs.writeFileSync(`${filePath}.sha256`, checksum);
    console.log(`Generated checksum for ${file}: ${checksum}`);
  }
});