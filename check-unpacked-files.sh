#!/bin/bash
# Check if yt-dlp binary was properly unpacked in the built app

echo "🔍 Checking for unpacked yt-dlp files in built app..."
echo ""

APP_PATH="release/0.0.0/mac-arm64/Nodify.app"

if [ ! -d "$APP_PATH" ]; then
  echo "❌ Built app not found at: $APP_PATH"
  exit 1
fi

echo "✅ App found at: $APP_PATH"
echo ""

ASAR_UNPACKED="$APP_PATH/Contents/Resources/app.asar.unpacked"

if [ ! -d "$ASAR_UNPACKED" ]; then
  echo "❌ app.asar.unpacked directory not found!"
  exit 1
fi

echo "✅ app.asar.unpacked directory exists"
echo ""

YT_DLP_PATH="$ASAR_UNPACKED/node_modules/yt-dlp-exec"

if [ ! -d "$YT_DLP_PATH" ]; then
  echo "❌ yt-dlp-exec not found in unpacked directory!"
  echo "Looking for: $YT_DLP_PATH"
  exit 1
fi

echo "✅ yt-dlp-exec directory found"
echo ""

YT_DLP_BIN="$YT_DLP_PATH/bin/yt-dlp"

if [ ! -f "$YT_DLP_BIN" ]; then
  echo "❌ yt-dlp binary not found!"
  echo "Looking for: $YT_DLP_BIN"
  exit 1
fi

echo "✅ yt-dlp binary found at: $YT_DLP_BIN"
echo ""

# Check if binary is executable
if [ -x "$YT_DLP_BIN" ]; then
  echo "✅ yt-dlp binary is executable"
else
  echo "⚠️  yt-dlp binary is NOT executable"
  echo "   Attempting to fix permissions..."
  chmod +x "$YT_DLP_BIN"
  if [ -x "$YT_DLP_BIN" ]; then
    echo "   ✅ Permissions fixed"
  else
    echo "   ❌ Failed to fix permissions"
  fi
fi

echo ""
echo "📊 Binary details:"
ls -lh "$YT_DLP_BIN"

echo ""
echo "🎉 All checks passed!"
