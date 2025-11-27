/**
 * YouTube Transcript Fetcher using Timedtext API
 * Fallback method when yt-dlp is not available
 */

const https = require('https')
const { parseStringPromise } = require('xml2js')

/**
 * Fetch YouTube transcript using Timedtext API
 * @param {string} videoId - YouTube video ID (11 characters)
 * @returns {Promise<{text: string, segments: Array, method: string}>}
 */
async function fetchTranscriptTimedtext(videoId) {
  console.log(`[timedtext] Fetching transcript for video: ${videoId}`)

  try {
    // Step 1: Fetch video page to extract caption tracks
    const videoPageHtml = await new Promise((resolve, reject) => {
      https
        .get(
          `https://www.youtube.com/watch?v=${videoId}`,
          {
            headers: {
              'Accept-Language': 'en-US,en;q=0.9',
              'User-Agent':
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            },
          },
          (res) => {
            let data = ''
            res.on('data', (chunk) => (data += chunk))
            res.on('end', () => resolve(data))
            res.on('error', reject)
          }
        )
        .on('error', reject)
    })

    console.log('[timedtext] Fetched video page')

    // Step 2: Extract caption tracks from page
    const captionTracksMatch = videoPageHtml.match(
      /"captionTracks":\s*(\[.*?\])/
    )
    if (!captionTracksMatch) {
      throw new Error('No caption tracks found for this video')
    }

    const captionTracks = JSON.parse(captionTracksMatch[1])
    console.log(`[timedtext] Found ${captionTracks.length} caption track(s)`)

    // Step 3: Select best English caption track
    let captionUrl = null
    const priorities = ['en', 'a.en', ''] // Prefer manual English, then auto-generated, then any

    for (const lang of priorities) {
      const track = captionTracks.find(
        (t) =>
          t.languageCode === lang ||
          t.vssId?.includes(lang) ||
          (lang === '' && t)
      )
      if (track?.baseUrl) {
        captionUrl = track.baseUrl
        console.log(
          `[timedtext] Selected caption track: ${
            track.languageCode || 'first available'
          }`
        )
        break
      }
    }

    if (!captionUrl) {
      throw new Error('No caption URL found')
    }

    // Step 4: Fetch caption XML
    const captionXml = await new Promise((resolve, reject) => {
      https
        .get(captionUrl, (res) => {
          let data = ''
          res.on('data', (chunk) => (data += chunk))
          res.on('end', () => resolve(data))
          res.on('error', reject)
        })
        .on('error', reject)
    })

    console.log('[timedtext] Fetched caption XML')

    // Step 5: Parse XML to extract text
    let textSegments = []

    try {
      const captionData = await parseStringPromise(captionXml)

      if (captionData?.transcript?.text) {
        textSegments = captionData.transcript.text
          .map((item) => {
            // Handle both {_: 'text'} and direct 'text' formats
            const text = typeof item === 'object' ? item._ || '' : item || ''
            if (typeof text === 'string') {
              return text
                .replace(/&amp;#39;/g, "'")
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/\n/g, ' ')
                .trim()
            }
            return ''
          })
          .filter((t) => t.length > 0)
      }
    } catch (parseError) {
      console.log('[timedtext] XML parsing failed, trying manual extraction')

      // Fallback: Manual regex extraction
      const textMatches = captionXml.matchAll(/<text[^>]*>([^<]*)<\/text>/g)
      textSegments = Array.from(textMatches)
        .map((match) =>
          match[1]
            .replace(/&amp;#39;/g, "'")
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim()
        )
        .filter((t) => t.length > 0)
    }

    if (textSegments.length === 0) {
      throw new Error('No transcript text found in captions')
    }

    const fullText = textSegments.join(' ')

    console.log(
      `[timedtext] Successfully parsed ${textSegments.length} segments (${fullText.length} characters)`
    )

    return {
      text: fullText,
      segments: [], // Timedtext doesn't provide timing info easily
      method: 'timedtext',
    }
  } catch (error) {
    console.error('[timedtext] Error:', error.message)
    throw error
  }
}

module.exports = {
  fetchTranscriptTimedtext,
}
