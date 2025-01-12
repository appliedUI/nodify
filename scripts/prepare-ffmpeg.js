const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create resources directory if it doesn't exist
const resourcesDir = path.join(__dirname, '..', 'resources');
if (!fs.existsSync(resourcesDir)) {
    fs.mkdirSync(resourcesDir, { recursive: true });
}

// Copy FFmpeg from node_modules
const ffmpegSrc = path.join(__dirname, '..', 'node_modules', 'ffmpeg-static', 'ffmpeg');
const ffmpegDest = path.join(resourcesDir, 'ffmpeg');

// Copy FFprobe from node_modules
const ffprobeSrc = path.join(__dirname, '..', 'node_modules', '@ffprobe-installer', 'darwin-arm64', 'ffprobe');
const ffprobeDest = path.join(resourcesDir, 'ffprobe');

console.log('Copying FFmpeg binaries...');

try {
    // Copy FFmpeg
    fs.copyFileSync(ffmpegSrc, ffmpegDest);
    execSync(`chmod 755 "${ffmpegDest}"`);
    console.log('FFmpeg copied and permissions set');

    // Copy FFprobe
    fs.copyFileSync(ffprobeSrc, ffprobeDest);
    execSync(`chmod 755 "${ffprobeDest}"`);
    console.log('FFprobe copied and permissions set');

    // Verify permissions
    const ffmpegStats = fs.statSync(ffmpegDest);
    const ffprobeStats = fs.statSync(ffprobeDest);
    console.log('FFmpeg permissions:', ffmpegStats.mode.toString(8));
    console.log('FFprobe permissions:', ffprobeStats.mode.toString(8));

    console.log('FFmpeg binaries prepared successfully');
} catch (error) {
    console.error('Error preparing FFmpeg binaries:', error);
    process.exit(1);
}
