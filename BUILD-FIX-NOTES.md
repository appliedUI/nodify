# Production Build Fixes for YouTube Transcript Extraction

## Issues Fixed

### 1. `yt-dlp-exec` Binary Not Available in Production Build

**Problem:** The `yt-dlp` binary was being packaged inside the `.asar` archive, making it inaccessible for execution.

**Solution:** Added `yt-dlp-exec` to the `asarUnpack` configuration in `package.json`:

```json
"asarUnpack": [
  "resources/ffmpeg/**/*",
  "resources/ffprobe/**/*",
  "assets/encrypt/**/*",
  "node_modules/yt-dlp-exec/**/*",
  "node_modules/yt-dlp-wrap/**/*"
]
```

This unpacks the yt-dlp binaries from the asar archive so they can be executed in the production build.

### 2. YouTube Iframe CSP Violation

**Problem:** The YouTube player iframe was blocked by Content Security Policy in production, showing:

```
EvalError: Refused to evaluate a string as JavaScript because this document requires 'Trusted Type' assignment.
```

**Solution:** Added `'unsafe-eval'` to the production CSP `script-src` directive in `electron/main.cjs`:

```javascript
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://*.ytimg.com ...
```

This allows the YouTube player to use dynamic code evaluation required for video playback.

## Testing the Fix

### 1. Clean Previous Builds

```bash
rm -rf release/
rm -rf dist/
```

### 2. Rebuild for Mac

```bash
npm run electron:build:mac
```

### 3. Test the Built App

After building, open the app from:

```
release/0.0.0/mac-arm64/Nodify.app
```

or

```
release/0.0.0/mac/Nodify.app
```

### 4. Verify Both Features Work

- **Transcript Extraction**: Paste a YouTube URL and verify the transcript is fetched successfully
- **Video Overlay**: Verify the YouTube video preview shows in the draggable overlay

## Expected Console Output (Success)

```
🎬 Fetching YouTube transcript for video ID: [VIDEO_ID]
📋 Attempting to fetch transcript from YouTube...
🔄 Trying yt-dlp method...
[yt-dlp] Fetching transcript for video: [VIDEO_ID]
[yt-dlp] Video info fetched successfully
[yt-dlp] Downloading caption data...
[yt-dlp] Successfully parsed [N] segments ([M] characters)
✅ yt-dlp success: [M] characters, [N] segments
```

## Architecture Notes

### Why These Fixes Are Necessary

1. **Binary Unpacking**: Node modules with native binaries (like `yt-dlp-exec`) must be unpacked from the asar archive because:

   - The asar archive is read-only
   - Child processes need direct file system access to execute binaries
   - This is the same reason ffmpeg and ffprobe are unpacked

2. **CSP for YouTube**: YouTube's player uses dynamic code evaluation for:

   - Video player initialization
   - Advertisement loading
   - Analytics tracking
   - Player API callbacks

   While `'unsafe-eval'` reduces security slightly, it's required for YouTube iframe embedding to function.

## Related Files

- `package.json` - Build configuration and asar unpacking
- `electron/main.cjs` - Content Security Policy configuration
- `electron/youtubeTranscriptYtDlp.cjs` - yt-dlp-exec wrapper
- `electron/youtubeTranscriptTimedtext.cjs` - Fallback transcript method
- `test-transcript-extraction.js` - Standalone test for transcript extraction
- `src/modules/workspace/helpers/youtubeParser.js` - Vue-side helper utilities

## Verifying the Build

After building, verify the yt-dlp binary was unpacked correctly:

```bash
./check-unpacked-files.sh
```

This should show:

```
 yt-dlp binary found at: release/0.0.0/mac-arm64/Nodify.app/Contents/Resources/app.asar.unpacked/node_modules/yt-dlp-exec/bin/yt-dlp
 yt-dlp binary is executable
```

## Checking Main Process Logs

When you run the built app, you need to see the main process console logs. To view them:

**On Mac:**

```bash
# Run the app from terminal to see main process logs:
./release/0.0.0/mac-arm64/Nodify.app/Contents/MacOS/Nodify
```

**Look for these log messages when fetching a transcript:**

```
[yt-dlp] Fetching transcript for video: [VIDEO_ID]
[yt-dlp] App is packaged: true
[yt-dlp] App path: /path/to/app.asar
[yt-dlp] yt-dlp-exec module loaded successfully
[yt-dlp] Setting binary path for production: /path/to/app.asar.unpacked/node_modules/yt-dlp-exec/bin/yt-dlp
[yt-dlp] Binary found at expected path
[yt-dlp] Calling yt-dlp for video: https://youtu.be/[VIDEO_ID]
[yt-dlp] Video info fetched successfully
[yt-dlp] Downloading caption data...
[yt-dlp] Successfully parsed [N] segments ([M] characters)
```

## Troubleshooting

### If transcript extraction still fails:

1. **Check binary was unpacked:**

   ```bash
   ./check-unpacked-files.sh
   ```

2. **Check main process logs** (run app from terminal as shown above):
   - If you see `Binary NOT found at:`, the unpacking failed
   - If you see `Failed to load yt-dlp-exec:`, the module isn't being bundled correctly
   - If you see `stderr:` output, that's the actual yt-dlp error
3. **Manual test of the yt-dlp binary:**
   ```bash
   # Test if the unpacked binary works:
   ./release/0.0.0/mac-arm64/Nodify.app/Contents/Resources/app.asar.unpacked/node_modules/yt-dlp-exec/bin/yt-dlp --version
   ```

### If YouTube video doesn't display:

1. Open DevTools in the renderer process (View menu or Cmd+Option+I if enabled)
2. Check for CSP violations in the Console
3. Verify the iframe is being created: look for `<iframe src="https://www.youtube.com/embed/..."`
4. Check Network tab to ensure YouTube resources are loading
