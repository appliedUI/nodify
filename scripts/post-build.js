const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get the app name from package.json
const packageJson = require('../package.json');
const appName = packageJson.name;

// Construct paths
const appPath = path.join(__dirname, '..', 'release', '0.0.0', 'mac-arm64', `${appName}.app`);
const resourcesPath = path.join(appPath, 'Contents', 'Resources');
const ffmpegPath = path.join(resourcesPath, 'ffmpeg');
const ffprobePath = path.join(resourcesPath, 'ffprobe');

console.log('Setting permissions for FFmpeg binaries...');
console.log('Resources path:', resourcesPath);
console.log('FFmpeg path:', ffmpegPath);
console.log('FFprobe path:', ffprobePath);

try {
    // Check if files exist
    if (!fs.existsSync(ffmpegPath)) {
        console.error('FFmpeg binary not found at:', ffmpegPath);
        process.exit(1);
    }
    if (!fs.existsSync(ffprobePath)) {
        console.error('FFprobe binary not found at:', ffprobePath);
        process.exit(1);
    }

    // Set executable permissions
    execSync(`chmod 755 "${ffmpegPath}"`);
    execSync(`chmod 755 "${ffprobePath}"`);
    console.log('Permissions set successfully');
    
    // Verify permissions
    const ffmpegStats = fs.statSync(ffmpegPath);
    const ffprobeStats = fs.statSync(ffprobePath);
    console.log('FFmpeg permissions:', ffmpegStats.mode.toString(8));
    console.log('FFprobe permissions:', ffprobeStats.mode.toString(8));
} catch (error) {
    console.error('Error setting permissions:', error);
    process.exit(1);
}
