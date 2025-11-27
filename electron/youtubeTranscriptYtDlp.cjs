/**
 * YouTube Transcript Fetcher using yt-dlp
 * This is the most reliable method for fetching YouTube transcripts
 */

const https = require('https')

/**
 * Fetch YouTube transcript using yt-dlp
 * @param {string} videoId - YouTube video ID (11 characters)
 * @returns {Promise<{text: string, segments: Array<{start: number, dur: number, text: string}>, method: string}>}
 */
async function fetchTranscriptYT(videoId) {
  console.log(`[yt-dlp] Fetching transcript for video: ${videoId}`)

  try {
    // Dynamically require yt-dlp-exec
    let ytdlp
    try {
      ytdlp = require('yt-dlp-exec')
    } catch (e) {
      throw new Error(
        'yt-dlp-exec not installed. This package is required for transcript fallback.'
      )
    }

    // Fetch video info with captions
    const info = await ytdlp(`https://youtu.be/${videoId}`, {
      writeAutoSub: true,
      subFormat: 'json3',
      skipDownload: true,
      dumpSingleJson: true,
      noWarnings: true,
      quiet: true,
    })

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
    throw error
  }
}

module.exports = {
  fetchTranscriptYT,
}
