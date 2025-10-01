const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

module.exports = async (context) => {
  if (process.platform !== 'darwin') return;

  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  const resourcesPath = path.join(appPath, 'Contents', 'Resources');
  const appContentsPath = path.join(appPath, 'Contents');
  
  console.log('Fixing dependencies signatures...');

  // Common problematic file patterns
  const patterns = [
    '**/*.node',
    '**/*.dylib',
    '**/*.so',
    '**/bin/*',
    '**/.bin/*',
    '**/ffmpeg',
    '**/ffprobe'
  ];

  const filesToSign = [];

  // Find all potentially problematic files
  patterns.forEach(pattern => {
    try {
      const found = execSync(`find "${resourcesPath}" -name "${pattern.replace('**/', '')}" -type f`, {
        encoding: 'utf8'
      }).split('\n').filter(Boolean);
      
      filesToSign.push(...found);
    } catch (error) {
      // Pattern might not match any files
    }
  });

  // Also check specific known problematic locations
  const knownLocations = [
    path.join(resourcesPath, 'app', 'node_modules', 'node-pty', 'build', 'Release'),
    path.join(resourcesPath, 'app', 'node_modules', 'better-sqlite3', 'build', 'Release'),
    path.join(resourcesPath, 'app', 'node_modules', 'sharp', 'vendor'),
    path.join(resourcesPath, 'app', 'node_modules', 'keytar', 'build', 'Release')
  ];

  knownLocations.forEach(location => {
    if (fs.existsSync(location)) {
      try {
        const files = execSync(`find "${location}" -type f -perm +111`, {
          encoding: 'utf8'
        }).split('\n').filter(Boolean);
        
        filesToSign.push(...files);
      } catch (error) {
        console.log(`No files found in ${location}`);
      }
    }
  });

  // Remove duplicates
  const uniqueFiles = [...new Set(filesToSign)];

  console.log(`Found ${uniqueFiles.length} files to re-sign`);

  // Re-sign each file with proper entitlements
  for (const file of uniqueFiles) {
    if (fs.existsSync(file)) {
      try {
        console.log(`Re-signing: ${path.relative(resourcesPath, file)}`);
        
        execSync(`codesign --force --sign "${process.env.CSC_NAME}" --entitlements build/entitlements.mac.plist --timestamp --options runtime "${file}"`, {
          stdio: 'inherit'
        });
      } catch (error) {
        console.error(`Failed to sign ${file}:`, error.message);
      }
    }
  }

  console.log('Dependency fixing completed');
};