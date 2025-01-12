@echo off
echo Setting up FFmpeg for Windows build...

rem Create base directories if they don't exist
if not exist "resources\ffmpeg\win" mkdir "resources\ffmpeg\win"
if not exist "resources\ffprobe\win" mkdir "resources\ffprobe\win"

rem Get node_modules path
set NODE_MODULES=%cd%\node_modules

echo Node modules path: %NODE_MODULES%

rem Copy FFmpeg binaries
echo Copying FFmpeg binaries...
copy "%NODE_MODULES%\ffmpeg-static\ffmpeg.exe" "resources\ffmpeg\win\ffmpeg.exe"

rem Copy FFprobe binaries
echo Copying FFprobe binaries...
copy "%NODE_MODULES%\@ffprobe-installer\win32-x64\ffprobe.exe" "resources\ffprobe\win\ffprobe.exe"

rem Verify existing binaries
echo Verifying FFmpeg binaries...
if exist "resources\ffmpeg\win\ffmpeg.exe" (
    echo FFmpeg binary found
) else (
    echo Error: FFmpeg binary missing from resources\ffmpeg\win\ffmpeg.exe
    exit /b 1
)

if exist "resources\ffprobe\win\ffprobe.exe" (
    echo FFprobe binary found
) else (
    echo Error: FFprobe binary missing from resources\ffprobe\win\ffprobe.exe
    exit /b 1
)

rem Create .gitkeep
type nul > resources\.gitkeep

echo Resource directory contents:
dir /s /b resources

echo Setup complete!