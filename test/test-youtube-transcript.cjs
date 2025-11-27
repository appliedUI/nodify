const https = require('https')
const { parseStringPromise } = require('xml2js')

/**
 * Test 1: Innertube API method (Modern, recommended)
 */
async function testInnertubeMethod(videoId) {
  console.log('\n🧪 Testing Innertube API Method')
  console.log('='.repeat(50))

  try {
    const url =
      'https://www.youtube.com/youtubei/v1/get_transcript?prettyPrint=false'

    const payload = JSON.stringify({
      videoId,
      params: 'CgYSBAgAEAEwAQ%3D%3D',
      context: {
        client: {
          hl: 'en',
          gl: 'US',
          clientName: 'WEB',
          clientVersion: '2.20241211.01.00',
        },
      },
    })

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    }

    const response = await new Promise((resolve, reject) => {
      const req = https.request(url, options, (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(JSON.parse(data))
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`))
          }
        })
      })
      req.on('error', reject)
      req.write(payload)
      req.end()
    })

    console.log('✅ Innertube API call successful')

    // Parse response
    const segments =
      response.actions?.[0]?.updateEngagementPanelAction?.content
        ?.transcriptRenderer?.content?.transcriptSearchPanelRenderer?.body
        ?.transcriptSegmentListRenderer?.initialSegments || []

    if (segments.length === 0) {
      console.log('⚠️  No segments found in response')
      console.log(
        'Response structure:',
        JSON.stringify(response, null, 2).substring(0, 500)
      )
      return null
    }

    const parsedSegments = segments.map((seg) => {
      const r = seg.transcriptSegmentRenderer
      return {
        start: parseFloat(r.startMs) / 1000,
        dur: parseFloat(r.endMs - r.startMs) / 1000,
        text: r.snippet.runs
          .map((x) => x.text)
          .join('')
          .trim(),
      }
    })

    const fullText = parsedSegments.map((s) => s.text).join(' ')

    console.log(`✅ Parsed ${parsedSegments.length} segments`)
    console.log(`📝 Total transcript length: ${fullText.length} characters`)
    console.log(
      `\n🎯 First 200 characters:\n"${fullText.substring(0, 200)}..."`
    )

    return { text: fullText, segments: parsedSegments, method: 'innertube' }
  } catch (error) {
    console.error('❌ Innertube method failed:', error.message)
    return null
  }
}

/**
 * Test 2: Timedtext API method (Fallback)
 */
async function testTimedtextMethod(videoId) {
  console.log('\n🧪 Testing Timedtext API Method')
  console.log('='.repeat(50))

  try {
    // Step 1: Fetch video page to get caption tracks
    const videoPageHtml = await new Promise((resolve, reject) => {
      https
        .get(
          `https://www.youtube.com/watch?v=${videoId}`,
          { headers: { 'Accept-Language': 'en-US,en;q=0.9' } },
          (res) => {
            let data = ''
            res.on('data', (chunk) => (data += chunk))
            res.on('end', () => resolve(data))
          }
        )
        .on('error', reject)
    })

    console.log('✅ Fetched video page')

    // Extract caption tracks
    const captionTracksMatch = videoPageHtml.match(
      /"captionTracks":\s*(\[.*?\])/
    )
    if (!captionTracksMatch) {
      console.log('⚠️  No caption tracks found in video page')
      return null
    }

    const captionTracks = JSON.parse(captionTracksMatch[1])
    console.log(
      `✅ Found ${captionTracks.length} caption track(s):`,
      captionTracks.map((t) => t.languageCode)
    )

    // Select English caption
    let captionUrl = null
    for (const lang of ['en', 'a.en', '']) {
      const track = captionTracks.find(
        (t) =>
          t.languageCode === lang ||
          t.vssId?.includes(lang) ||
          (lang === '' && t)
      )
      if (track?.baseUrl) {
        captionUrl = track.baseUrl
        console.log(
          `✅ Selected caption track: ${
            track.languageCode || 'first available'
          }`
        )
        break
      }
    }

    if (!captionUrl) {
      console.log('⚠️  No caption URL found')
      return null
    }

    // Fetch caption XML
    const captionXml = await new Promise((resolve, reject) => {
      https
        .get(captionUrl, (res) => {
          let data = ''
          res.on('data', (chunk) => (data += chunk))
          res.on('end', () => resolve(data))
        })
        .on('error', reject)
    })

    console.log('✅ Fetched caption XML')

    // Parse XML - handle both formats
    let textSegments = []
    try {
      const captionData = await parseStringPromise(captionXml)

      if (captionData?.transcript?.text) {
        textSegments = captionData.transcript.text.map((item) => {
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
      }
    } catch (parseError) {
      console.log('⚠️  XML parsing failed:', parseError.message)
      // Try manual parsing as fallback
      const textMatches = captionXml.matchAll(/<text[^>]*>([^<]*)<\/text>/g)
      textSegments = Array.from(textMatches).map((match) =>
        match[1]
          .replace(/&amp;#39;/g, "'")
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim()
      )
    }

    const fullText = textSegments.filter((t) => t && t.length > 0).join(' ')

    if (fullText.length > 0) {
      console.log(`✅ Parsed ${textSegments.length} segments`)
      console.log(`📝 Total transcript length: ${fullText.length} characters`)
      console.log(
        `\n🎯 First 200 characters:\n"${fullText.substring(0, 200)}..."`
      )
      return { text: fullText, segments: [], method: 'timedtext' }
    } else {
      console.log('⚠️  Caption XML parsed but no text found')
      return null
    }
  } catch (error) {
    console.error('❌ Timedtext method failed:', error.message)
    return null
  }
}

/**
 * Test 3: yt-dlp method (Most reliable fallback)
 */
async function testYtDlpMethod(videoId) {
  console.log('\n🧪 Testing yt-dlp Method')
  console.log('='.repeat(50))

  try {
    // Check if yt-dlp-exec is installed
    let ytdlp
    try {
      ytdlp = require('yt-dlp-exec')
    } catch (e) {
      console.log('⚠️  yt-dlp-exec not installed. Run: npm install yt-dlp-exec')
      console.log('   This is optional but provides the most reliable fallback')
      return null
    }

    console.log('✅ yt-dlp-exec found, fetching transcript...')

    const info = await ytdlp(`https://youtu.be/${videoId}`, {
      writeAutoSub: true,
      subFormat: 'json3',
      skipDownload: true,
      dumpSingleJson: true,
      noWarnings: true,
    })

    console.log('✅ yt-dlp fetch successful')

    // Get captions
    const caps = info.subtitles?.en || info.automatic_captions?.en
    if (!caps || caps.length === 0) {
      console.log('⚠️  No English captions found')
      return null
    }

    // Parse JSON3 format
    const json3Data = caps.find((c) => c.ext === 'json3')
    if (!json3Data) {
      console.log('⚠️  No json3 format found')
      return null
    }

    // Download and parse json3
    const json3Content = await new Promise((resolve, reject) => {
      https
        .get(json3Data.url, (res) => {
          let data = ''
          res.on('data', (chunk) => (data += chunk))
          res.on('end', () => resolve(JSON.parse(data)))
        })
        .on('error', reject)
    })

    const events = json3Content.events || []
    const segments = events
      .filter((e) => e.segs)
      .map((e) => ({
        start: e.tStartMs / 1000,
        dur: e.dDurationMs / 1000,
        text: e.segs
          .map((s) => s.utf8)
          .join('')
          .trim(),
      }))

    const fullText = segments.map((s) => s.text).join(' ')

    console.log(`✅ Parsed ${segments.length} segments`)
    console.log(`📝 Total transcript length: ${fullText.length} characters`)
    console.log(
      `\n🎯 First 200 characters:\n"${fullText.substring(0, 200)}..."`
    )

    return { text: fullText, segments, method: 'yt-dlp' }
  } catch (error) {
    console.error('❌ yt-dlp method failed:', error.message)
    return null
  }
}

/**
 * Run all tests
 */
async function runTests() {
  // Test with a known video that has transcripts
  // Alternative test videos: 'jNQXAC9IVRw' (Me at the zoo), 'dQw4w9WgXcQ' (Rick Astley)
  const testVideoId = process.argv[2] || 'jNQXAC9IVRw' // Default: First YouTube video

  console.log('\n' + '='.repeat(60))
  console.log('🧪 YouTube Transcript Extraction Test Suite')
  console.log('='.repeat(60))
  console.log(`\n📹 Testing with video ID: ${testVideoId}`)
  console.log(`🔗 URL: https://www.youtube.com/watch?v=${testVideoId}`)

  const results = {
    innertube: null,
    timedtext: null,
    ytdlp: null,
  }

  // Test each method
  results.innertube = await testInnertubeMethod(testVideoId)
  results.timedtext = await testTimedtextMethod(testVideoId)
  results.ytdlp = await testYtDlpMethod(testVideoId)

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 Test Results Summary')
  console.log('='.repeat(60))
  console.log(`Innertube API:  ${results.innertube ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Timedtext API:  ${results.timedtext ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`yt-dlp:         ${results.ytdlp ? '✅ PASS' : '❌ FAIL'}`)

  const workingMethods = Object.values(results).filter((r) => r !== null).length
  console.log(`\n${workingMethods}/3 methods working`)

  if (workingMethods === 0) {
    console.log(
      '\n⚠️  WARNING: No methods working! Check your network connection.'
    )
  } else if (workingMethods >= 2) {
    console.log('\n✅ EXCELLENT: Multiple methods working - good redundancy!')
  } else {
    console.log('\n✅ GOOD: At least one method working')
  }

  console.log('\n' + '='.repeat(60))
  console.log('💡 Recommendations:')
  if (results.innertube) {
    console.log('   • Use Innertube as primary method (fast & reliable)')
  }
  if (results.timedtext && !results.innertube) {
    console.log('   • Use Timedtext as primary fallback')
  }
  if (!results.ytdlp) {
    console.log('   • Consider installing yt-dlp-exec for maximum reliability')
    console.log('     Run: npm install yt-dlp-exec')
  }
  console.log('='.repeat(60) + '\n')
}

// Run tests
if (require.main === module) {
  runTests().catch(console.error)
}

module.exports = {
  testInnertubeMethod,
  testTimedtextMethod,
  testYtDlpMethod,
}
