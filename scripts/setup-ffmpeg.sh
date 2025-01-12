#!/bin/bash

# Create base directories
rm -rf resources
mkdir -p resources/ffmpeg/{win,mac,linux}
mkdir -p resources/ffprobe/{win,mac,linux}

# Get node_modules path
NODE_MODULES=$(npm root)

# Debug output
echo "Node modules path: ${NODE_MODULES}"

# Copy FFmpeg binaries
echo "Copying FFmpeg binaries..."
# Windows - ensure .exe extension
cp "${NODE_MODULES}/ffmpeg-static/ffmpeg.exe" resources/ffmpeg/win/ffmpeg.exe || echo "Warning: No Windows FFmpeg"
cp "${NODE_MODULES}/ffmpeg-static/ffmpeg" resources/ffmpeg/mac/ || echo "Warning: No Mac FFmpeg"
cp "${NODE_MODULES}/ffmpeg-static/ffmpeg" resources/ffmpeg/linux/ || echo "Warning: No Linux FFmpeg"

# Copy FFprobe binaries
echo "Copying FFprobe binaries..."
# Windows - ensure .exe extension 
cp "${NODE_MODULES}/@ffprobe-installer/win32-x64/ffprobe.exe" resources/ffprobe/win/ffprobe.exe || echo "Warning: No Windows FFprobe"
# Try both darwin-x64 and darwin-arm64 for Mac
cp "${NODE_MODULES}/@ffprobe-installer/darwin-x64/ffprobe" resources/ffprobe/mac/ || \
cp "${NODE_MODULES}/@ffprobe-installer/darwin-arm64/ffprobe" resources/ffprobe/mac/ || \
echo "Warning: No Mac FFprobe"
cp "${NODE_MODULES}/@ffprobe-installer/linux-x64/ffprobe" resources/ffprobe/linux/ || echo "Warning: No Linux FFprobe"

# Set execute permissions (not needed for Windows .exe files)
echo "Setting permissions..."
chmod +x resources/ffmpeg/mac/ffmpeg || true
chmod +x resources/ffmpeg/linux/ffmpeg || true
chmod +x resources/ffprobe/mac/ffprobe || true
chmod +x resources/ffprobe/linux/ffprobe || true

# List contents for verification
echo "Resource directory contents:"
ls -R resources/

# Ensure resources directory is included in the build
touch resources/.gitkeep
