/**
 * Simple Node test to verify yt-dlp-exec transcript extraction
 * Run with: node test-transcript-extraction.js
 */

const https = require('https')

async function testTranscriptExtraction(videoId) {
  console.log(`\n🧪 Testing transcript extraction for video: ${videoId}`)
  console.log('=' .repeat(60))

  try {
    // Dynamically require yt-dlp-exec
    let ytdlp
    try {
      ytdlp = require('yt-dlp-exec')
      console.log('✅ yt-dlp-exec package loaded')
    } catch (e) {
      throw new Error(
        'yt-dlp-exec not installed. Run: npm install yt-dlp-exec'
      )
    }

    // Fetch video info with captions
    console.log('📥 Fetching video info and captions...')
    const info = await ytdlp(`https://youtu.be/${videoId}`, {
      writeAutoSub: true,
      subFormat: 'json3',
      skipDownload: true,
      dumpSingleJson: true,
      noWarnings: true,
      quiet: true,
    })

    console.log('✅ Video info fetched successfully')

    // Get English captions (prefer manual, fallback to auto-generated)
    const caps = info.subtitles?.en || info.automatic_captions?.en
    if (!caps || caps.length === 0) {
      throw new Error('No English captions available for this video')
    }

    console.log(`📝 Found ${caps.length} caption track(s)`)

    // Find json3 format
    const json3Data = caps.find((c) => c.ext === 'json3')
    if (!json3Data || !json3Data.url) {
      throw new Error('No json3 caption format available')
    }

    console.log('⬇️  Downloading caption data...')

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

    console.log('✅ Transcript extraction successful!')
    console.log('=' .repeat(60))
    console.log(`📊 Stats:`)
    console.log(`   - Segments: ${segments.length}`)
    console.log(`   - Characters: ${fullText.length}`)
    console.log(`   - Words (approx): ${fullText.split(/\s+/).length}`)
    console.log(`   - Duration: ~${Math.round(segments[segments.length - 1].start)}s`)
    console.log('=' .repeat(60))
    console.log(`\n📄 First 200 characters of transcript:`)
    console.log(`"${fullText.substring(0, 200)}..."`)
    console.log('\n✅ Test PASSED\n')

    return {
      text: fullText,
      segments,
      method: 'yt-dlp',
    }
  } catch (error) {
    console.error('\n❌ Test FAILED')
    console.error('Error:', error.message)
    console.error('\n')
    throw error
  }
}

// Run test with a sample video ID
// Default: A short test video (replace with any YouTube video ID)
const testVideoId = process.argv[2] || 'dQw4w9WgXcQ' // Default test video

console.log('\n🎬 YouTube Transcript Extraction Test')
console.log('Usage: node test-transcript-extraction.js [VIDEO_ID]')

testTranscriptExtraction(testVideoId)
  .then(() => {
    console.log('✅ All tests completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Test suite failed:', error.message)
    process.exit(1)
  })
