/**
 * YouTube Transcript Fetcher using yt-dlp
 * This is the most reliable method for fetching YouTube transcripts
 */

const https = require('https')
const path = require('path')
const fs = require('fs')
const { app } = require('electron')
const { execFile } = require('child_process')

/**
 * Fetch YouTube transcript using yt-dlp
 * @param {string} videoId - YouTube video ID (11 characters)
 * @returns {Promise<{text: string, segments: Array<{start: number, dur: number, text: string}>, method: string}>}
 */
async function fetchTranscriptYT(videoId) {
  console.log(`[yt-dlp] Fetching transcript for video: ${videoId}`)
  console.log(`[yt-dlp] App is packaged: ${app.isPackaged}`)
  console.log(`[yt-dlp] App path: ${app.getAppPath()}`)

  try {
    // Determine which binary to use
    const binaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
    let ytDlpBinaryPath = null
    
    if (app.isPackaged) {
      // In production, use the unpacked binary directly
      const binaryPath = path.join(
        app.getAppPath() + '.unpacked',
        'node_modules',
        'yt-dlp-exec',
        'bin',
        binaryName
      )
      console.log(`[yt-dlp] Checking binary path for production: ${binaryPath}`)
      
      if (fs.existsSync(binaryPath)) {
        console.log('[yt-dlp] Binary found at expected path')
        ytDlpBinaryPath = binaryPath
      } else {
        console.error('[yt-dlp] Binary NOT found at:', binaryPath)
        
        // Try alternative path (resources path)
        const altPath = path.join(
          process.resourcesPath,
          'app.asar.unpacked',
          'node_modules',
          'yt-dlp-exec',
          'bin',
          binaryName
        )
        console.log('[yt-dlp] Trying alternative path:', altPath)
        if (fs.existsSync(altPath)) {
          console.log('[yt-dlp] Binary found at alternative path')
          ytDlpBinaryPath = altPath
        } else {
          throw new Error(`yt-dlp binary not found at ${binaryPath} or ${altPath}`)
        }
      }
    }

    // Fetch video info with captions
    const videoUrl = `https://youtu.be/${videoId}`
    console.log(`[yt-dlp] Calling yt-dlp for video: ${videoUrl}`)
    
    let info
    if (ytDlpBinaryPath) {
      // In production: use execFile directly to bypass yt-dlp-exec's path resolution
      console.log(`[yt-dlp] Using direct execFile with binary: ${ytDlpBinaryPath}`)
      const args = [
        videoUrl,
        '--write-auto-sub',
        '--sub-format', 'json3',
        '--skip-download',
        '--dump-single-json',
        '--no-warnings',
        '--quiet'
      ]
      
      info = await new Promise((resolve, reject) => {
        execFile(ytDlpBinaryPath, args, { maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
          if (error) {
            console.error('[yt-dlp] execFile error:', error.message)
            if (stderr) console.error('[yt-dlp] stderr:', stderr)
            reject(error)
            return
          }
          try {
            resolve(JSON.parse(stdout))
          } catch (parseError) {
            reject(new Error(`Failed to parse yt-dlp output: ${parseError.message}`))
          }
        })
      })
    } else {
      // In development: use yt-dlp-exec which handles its own binary
      let ytdlp
      try {
        ytdlp = require('yt-dlp-exec')
        console.log('[yt-dlp] Using yt-dlp-exec module for development')
      } catch (e) {
        console.error('[yt-dlp] Failed to load yt-dlp-exec:', e)
        throw new Error('yt-dlp-exec not installed')
      }
      
      info = await ytdlp(videoUrl, {
        writeAutoSub: true,
        subFormat: 'json3',
        skipDownload: true,
        dumpSingleJson: true,
        noWarnings: true,
        quiet: true,
      })
    }

    console.log('[yt-dlp] Video info fetched successfully')

    // Get English captions (prefer manual, fallback to auto-generated)
    const caps = info.subtitles?.en || info.automatic_captions?.en
    if (!caps || caps.length === 0) {
      throw new Error('No English captions available for this video')
    }

    // Find json3 format
    const json3Data = caps.find((c) => c.ext === 'json3')
    if (!json3Data || !json3Data.url) {
      throw new Error('No json3 caption format available')
    }

    console.log('[yt-dlp] Downloading caption data...')

    // Download and parse json3 caption data
    const json3Content = await new Promise((resolve, reject) => {
      https
        .get(json3Data.url, (res) => {
          let data = ''
          res.on('data', (chunk) => (data += chunk))
          res.on('end', () => {
            try {
              resolve(JSON.parse(data))
            } catch (e) {
              reject(new Error(`Failed to parse caption JSON: ${e.message}`))
            }
          })
          res.on('error', reject)
        })
        .on('error', reject)
    })

    // Parse events into segments
    const events = json3Content.events || []
    const segments = events
      .filter((e) => e.segs && e.segs.length > 0)
      .map((e) => ({
        start: (e.tStartMs || 0) / 1000,
        dur: (e.dDurationMs || 0) / 1000,
        text: e.segs
          .map((s) => s.utf8 || '')
          .join('')
          .trim(),
      }))
      .filter((s) => s.text.length > 0)

    if (segments.length === 0) {
      throw new Error('No transcript segments found in caption data')
    }

    // Join segments into full text
    const fullText = segments.map((s) => s.text).join(' ')

    console.log(
      `[yt-dlp] Successfully parsed ${segments.length} segments (${fullText.length} characters)`
    )

    return {
      text: fullText,
      segments,
      method: 'yt-dlp',
    }
  } catch (error) {
    console.error('[yt-dlp] Error:', error.message)
    console.error('[yt-dlp] Error stack:', error.stack)
    if (error.stderr) {
      console.error('[yt-dlp] stderr:', error.stderr)
    }
    if (error.stdout) {
      console.error('[yt-dlp] stdout:', error.stdout)
    }
    throw error
  }
}

module.exports = {
  fetchTranscriptYT,
}
