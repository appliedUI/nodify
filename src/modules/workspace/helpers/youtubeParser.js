/**
 * YouTube Parser Helpers
 * Utilities for parsing YouTube URLs and extracting transcripts
 */

/**
 * Extract YouTube video ID from various URL formats
 * @param {string} url - YouTube URL
 * @returns {string|null} - Video ID or null if invalid
 * 
 * Supported formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 */
export function extractVideoId(url) {
  if (!url || typeof url !== 'string') {
    return null
  }

  const trimmedUrl = url.trim()

  // RegExp pattern matches various YouTube URL formats
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = trimmedUrl.match(regExp)

  // YouTube video IDs are always 11 characters
  if (match && match[2].length === 11) {
    return match[2]
  }

  // If URL is just the video ID itself
  if (trimmedUrl.length === 11 && /^[a-zA-Z0-9_-]+$/.test(trimmedUrl)) {
    return trimmedUrl
  }

  return null
}

/**
 * Validate YouTube video ID format
 * @param {string} videoId - Video ID to validate
 * @returns {boolean} - Whether the ID is valid
 */
export function isValidVideoId(videoId) {
  if (!videoId || typeof videoId !== 'string') {
    return false
  }
  // YouTube video IDs are 11 characters: letters, numbers, underscores, hyphens
  return videoId.length === 11 && /^[a-zA-Z0-9_-]+$/.test(videoId)
}

/**
 * Construct a standard YouTube watch URL from a video ID
 * @param {string} videoId - YouTube video ID
 * @returns {string|null} - Full YouTube URL or null if invalid
 */
export function constructYouTubeUrl(videoId) {
  if (!isValidVideoId(videoId)) {
    return null
  }
  return `https://www.youtube.com/watch?v=${videoId}`
}

/**
 * Fetch YouTube transcript using yt-dlp-exec via Electron IPC
 * This is a wrapper around the Electron API for cleaner imports
 * @param {string} videoIdOrUrl - YouTube video ID or URL
 * @returns {Promise<{text: string, segments: Array, method: string}>}
 */
export async function fetchTranscript(videoIdOrUrl) {
  // Extract video ID if a URL was provided
  const videoId = extractVideoId(videoIdOrUrl) || videoIdOrUrl

  if (!isValidVideoId(videoId)) {
    throw new Error('Invalid YouTube video ID or URL')
  }

  // Check if Electron API is available
  if (!window.electronAPI || !window.electronAPI.fetchYouTubeTranscript) {
    throw new Error(
      'Electron API not available. This function must be called in an Electron app.'
    )
  }

  try {
    const result = await window.electronAPI.fetchYouTubeTranscript(videoId)

    // Handle both old string format and new structured format for backward compatibility
    if (typeof result === 'string') {
      return {
        text: result,
        segments: [],
        method: 'legacy',
      }
    }

    return {
      text: result.text || '',
      segments: result.segments || [],
      method: result.method || 'unknown',
    }
  } catch (error) {
    console.error('Failed to fetch transcript:', error)
    throw new Error(`Transcript fetch failed: ${error.message}`)
  }
}

/**
 * Parse YouTube URL and fetch transcript in one call
 * @param {string} url - YouTube URL
 * @returns {Promise<{videoId: string, url: string, transcript: {text: string, segments: Array, method: string}}>}
 */
export async function parseAndFetchTranscript(url) {
  const videoId = extractVideoId(url)

  if (!videoId) {
    throw new Error('Invalid YouTube URL')
  }

  const standardUrl = constructYouTubeUrl(videoId)
  const transcript = await fetchTranscript(videoId)

  return {
    videoId,
    url: standardUrl,
    transcript,
  }
}

/**
 * Check if a URL is a valid YouTube URL
 * @param {string} url - URL to check
 * @returns {boolean}
 */
export function isYouTubeUrl(url) {
  if (!url || typeof url !== 'string') {
    return false
  }

  const trimmedUrl = url.trim().toLowerCase()
  return (
    trimmedUrl.includes('youtube.com') ||
    trimmedUrl.includes('youtu.be')
  )
}

/**
 * Format transcript segments with timestamps
 * @param {Array<{start: number, dur: number, text: string}>} segments
 * @returns {string} - Formatted transcript with timestamps
 */
export function formatTranscriptWithTimestamps(segments) {
  if (!segments || segments.length === 0) {
    return ''
  }

  return segments
    .map((segment) => {
      const minutes = Math.floor(segment.start / 60)
      const seconds = Math.floor(segment.start % 60)
      const timestamp = `[${minutes}:${seconds.toString().padStart(2, '0')}]`
      return `${timestamp} ${segment.text}`
    })
    .join('\n')
}

/**
 * Get transcript statistics
 * @param {string} text - Transcript text
 * @param {Array} segments - Transcript segments
 * @returns {Object} - Statistics about the transcript
 */
export function getTranscriptStats(text, segments = []) {
  const wordCount = text ? text.split(/\s+/).filter(w => w.length > 0).length : 0
  const charCount = text ? text.length : 0
  const duration = segments.length > 0 
    ? Math.round(segments[segments.length - 1].start + segments[segments.length - 1].dur)
    : 0

  return {
    wordCount,
    charCount,
    segmentCount: segments.length,
    durationSeconds: duration,
    durationFormatted: duration > 0 
      ? `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`
      : '0:00',
  }
}
