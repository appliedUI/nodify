import { ref } from 'vue'

export function useYoutubeApi() {
  const API_KEY = localStorage.getItem('youtube_api_key')

  const searchVideos = async (
    query,
    page = 1,
    maxResults = 9,
    daysBack = 30,
    regionCode = 'US',
    pageToken = ''
  ) => {
    if (!API_KEY) {
      throw new Error('YouTube API key is required')
    }

    // Calculate publishedAfter date
    const publishedAfter = new Date()
    publishedAfter.setDate(publishedAfter.getDate() - daysBack)
    const isoDate = publishedAfter.toISOString()

    let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
      query
    )}&maxResults=${maxResults}&type=video&key=${API_KEY}&order=date&publishedAfter=${isoDate}&regionCode=${regionCode}`

    if (pageToken) {
      url += `&pageToken=${pageToken}`
    }

    const response = await fetch(url)
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

  const getWatchHistory = async (maxResults = 9) => {
    if (!API_KEY) {
      throw new Error('YouTube API key is required')
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/activities?part=snippet,contentDetails&mine=true&maxResults=${maxResults}&key=${API_KEY}`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch watch history')
    }

    const data = await response.json()
    return data.items
  }

  return {
    searchVideos,
    formatDuration,
    getWatchHistory,
  }
}
