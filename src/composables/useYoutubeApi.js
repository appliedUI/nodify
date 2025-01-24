import { ref } from 'vue'

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY

export function useYoutubeApi() {
  const searchVideos = async (query, page = 1, maxResults = 9) => {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
        query
      )}&maxResults=${maxResults}&pageToken=${pageToken}&type=video&key=${API_KEY}`
    )
    return await response.json()
  }

  const formatDuration = (duration) => {
    if (!duration) return ''
    // Convert ISO 8601 duration to readable format
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
    const hours = (match[1] || '').replace('H', '')
    const minutes = (match[2] || '').replace('M', '')
    const seconds = (match[3] || '').replace('S', '')

    return [
      hours && `${hours}:`,
      minutes.padStart(hours ? 2 : 1, '0'),
      ':',
      seconds.padStart(2, '0'),
    ].join('')
  }

  return {
    searchVideos,
    formatDuration,
  }
}
