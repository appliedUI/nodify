import { defineStore } from 'pinia'
import { useSubjectsStore } from './subjectsStore'
import { db } from '@/db/db'
import { useGraphForceStore } from '@/stores/graphForceStore'

const graphForceStore = useGraphForceStore()
export const useVideoStore = defineStore('video', {
  state: () => ({
    youtubeTranscript: null,
    processingProgress: null,
    isVideoProcessing: false,
    error: null,
    videoId: null,
    videoUrl: null,
    showVideo: false,
    isVideoSubject: false,
    transcriptLoading: false,
    transcriptError: null,
    retryCount: 0,
    maxRetries: 3,
  }),
  actions: {
    toggleVideo(show) {
      console.log(
        'toggleVideo called with:',
        show,
        'current videoId:',
        this.videoId
      )
      this.showVideo = show === undefined ? !this.showVideo : show
    },
    async setVideoUrl(subjectId, url) {
      console.log('setVideoUrl called:', { subjectId, url })
      this.videoUrl = url
      this.isVideoSubject = !!url
      // Update the subject immediately
      const subject = await db.subjects.get(subjectId)
      if (subject) {
        subject.youtubeUrl = url
        await db.subjects.put(subject)
      }
      return subject
    },

    //get the videoURL from the subjectID
    async getVideoUrl(subjectId) {
      try {
        console.log('getVideoUrl called for subject:', subjectId)

        // Validate subjectId
        if (
          !subjectId ||
          (typeof subjectId !== 'number' && typeof subjectId !== 'string')
        ) {
          throw new Error(`Invalid subjectId: ${subjectId}`)
        }

        // Convert to number if it's a string
        const id =
          typeof subjectId === 'string' ? parseInt(subjectId, 10) : subjectId

        console.log('Fetching video URL for subject:', id)
        const subject = await db.subjects.get(id)

        if (!subject) {
          console.warn(`Subject ${id} not found`)
          return null
        }

        const videoUrl = subject.youtubeUrl || null
        this.videoUrl = videoUrl

        // Extract video ID from URL
        if (videoUrl) {
          const videoId = this.extractVideoId(videoUrl)
          if (videoId) {
            this.videoId = videoId
          }
        }

        console.log('Found video URL:', videoUrl)
        return videoUrl
      } catch (error) {
        console.error('Error getting video URL:', error)
        this.error = error.message
        throw error
      }
    },

    extractVideoId(url) {
      const regExp =
        /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
      const match = url.match(regExp)
      return match && match[2].length === 11 ? match[2] : null
    },

    async fetchTranscript(videoId, subjectId) {
      console.log('🎬 Starting transcript fetch for video:', videoId)

      try {
        if (!videoId) throw new Error('Video ID is required')

        // Reset error state and set loading
        this.transcriptError = null
        this.transcriptLoading = true
        this.updateProcessingProgress({ isComplete: false })
        this.videoId = videoId

        console.log('📋 Fetching transcript from main process...')
        const fullTranscript = await window.electronAPI.fetchYouTubeTranscript(
          videoId
        )

        if (!fullTranscript || fullTranscript.trim().length === 0) {
          throw new Error('Empty transcript received')
        }

        console.log(
          '✅ Transcript fetched successfully, length:',
          fullTranscript.length
        )
        this.youtubeTranscript = fullTranscript
        this.retryCount = 0 // Reset retry count on success

        if (subjectId) {
          const subjectsStore = useSubjectsStore()
          await subjectsStore.updateTranscript(subjectId, fullTranscript)

          // Set up OpenAI progress listener
          window.electronAPI.onOpenaiProgress((event, progress) => {
            graphForceStore.updateProgress(progress)
          })

          graphForceStore.setGraphLoading(true)
          const graphData = await window.electronAPI.generateGraphWithOpenAI({
            apiKey: localStorage.getItem('openai_key'),
            transcript: fullTranscript,
            subjectId: subjectId,
          })
          await subjectsStore.setGraph(graphData)
        }

        return fullTranscript
      } catch (error) {
        console.error('❌ Error fetching YouTube transcript:', error)
        this.transcriptError = error.message
        this.error = error.message

        // Don't throw error immediately, allow for retry
        if (this.retryCount < this.maxRetries) {
          console.log(
            `🔄 Retry attempt ${this.retryCount + 1}/${this.maxRetries}`
          )
          this.retryCount++
          // Wait a bit before retry
          await new Promise((resolve) => setTimeout(resolve, 2000))
          return this.fetchTranscript(videoId, subjectId)
        }

        throw error
      } finally {
        this.transcriptLoading = false
        this.updateProcessingProgress({ isComplete: true })
      }
    },

    // Add retry functionality
    async retryTranscriptFetch(videoId, subjectId) {
      console.log('🔄 Retrying transcript fetch...')
      this.retryCount = 0 // Reset retry count
      this.transcriptError = null
      return this.fetchTranscript(videoId, subjectId)
    },

    // Clear transcript and error states
    clearTranscriptState() {
      this.youtubeTranscript = null
      this.transcriptError = null
      this.transcriptLoading = false
      this.retryCount = 0
    },

    updateProcessingProgress(progress) {
      this.processingProgress = progress
      this.isVideoProcessing = !progress.isComplete
      if (progress.isComplete) {
        setTimeout(() => {
          this.processingProgress = null
          this.isVideoProcessing = false
        }, 500)
      }
    },

    clearTranscript() {
      this.youtubeTranscript = null
      this.videoId = null
      this.error = null
    },

    async checkAndShowVideo(subjectId) {
      try {
        const videoUrl = await this.getVideoUrl(subjectId)
        if (videoUrl) {
          this.showVideo = true
          return true
        }
        return false
      } catch (error) {
        console.error('Error checking video:', error)
        this.showVideo = false
        return false
      }
    },
  },
})
