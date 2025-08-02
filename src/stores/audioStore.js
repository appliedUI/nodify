import { defineStore } from 'pinia'
import { useSubjectsStore } from './subjectsStore'
import { db } from '@/db/db'
import { ref } from 'vue'
import { toast } from 'vue3-toastify'
import { useGraphForceStore } from '@/stores/graphForceStore'

const graphForceStore = useGraphForceStore()

// Define store with consistent naming
export const useAudioStore = defineStore('audio', {
  state: () => ({
    transcripts: null,
    pendingTranscripts: new Map(), // Add pending transcripts queue
    processingProgress: null, // Add progress state
    isAudioProcessing: false, // Add new state
    isMarkdownProcessing: false, // Add new state
    isAudioRecording: false, // New flag for audio recording state
    error: '', // Add error state
    lastRecordingPath: '', // Add last recording path state
  }),
  actions: {
    addTranscript(transcript) {
      if (typeof transcript === 'string' && transcript.trim()) {
        this.transcripts = transcript
      }
    },

    clearTranscripts() {
      this.transcripts = null
    },

    async getTranscriptsBySubjectId(subjectId) {
      try {
        if (!subjectId) {
          console.error('No subjectId provided')
          return
        }

        const subject = await db.subjects.get(subjectId)
        if (!subject) {
          console.error('Subject not found:', subjectId)
          return
        }
        // Add this to selectedTranscript
        this.transcripts = subject.transcript
        return subject.transcript || null // Return the transcript as a string
      } catch (error) {
        console.error('Error fetching transcripts:', error)
        return null
      }
    },

    async handleTranscriptReceived(transcript) {
      if (!transcript?.trim()) {
        console.error('Invalid transcript:', transcript)
        return
      }

      const subjectsStore = useSubjectsStore()
      const currentSubject = subjectsStore.currentSubject

      if (!currentSubject) {
        console.error('No current subject found')
        return
      }

      // Only update transcript if this is an audio recording
      if (this.isAudioRecording) {
        await db.subjects.update(currentSubject.id, {
          transcript: transcript,
          markdownTranscript: transcript,
          youtubeUrl: null, // Ensure no YouTube URL is saved for audio recordings
        })
      }

      try {
        const cleanTranscript = transcript.trim()
        console.log('Processing transcript for subject:', {
          subjectId: currentSubject.id,
          transcript: cleanTranscript,
        })

        // Add to local transcripts first
        this.addTranscript(cleanTranscript)

        // Update in database and store
        await subjectsStore.updateTranscript(currentSubject.id, cleanTranscript)

        return true
      } catch (error) {
        console.error('Transcript save error:', error)
        throw error
      }
    },

    // Add new action for progress updates
    updateProcessingProgress(progress) {
      this.processingProgress = progress
      this.isAudioProcessing = !progress.isComplete // Update processing state
      if (progress.isComplete) {
        setTimeout(() => {
          this.processingProgress = null
          this.isAudioProcessing = false
        }, 500) // Short delay before clearing
      }
    },

    setMarkdownProcessing(isProcessing) {
      // Add new action
      this.isMarkdownProcessing = isProcessing
    },

    setAudioRecording(isRecording) {
      this.isAudioRecording = isRecording
    },

    setAudioProcessing(isProcessing) {
      this.isAudioProcessing = isProcessing
    },

    // Update sendAudioToWhisper to handle graph generation
    async sendAudioToWhisper(arrayBuffer) {
      this.error = ''
      this.isAudioProcessing = true
      graphForceStore.setGraphLoading(true)

      const processingToast = toast('Processing. Please wait...', {
        theme: 'auto',
        type: 'info',
        position: 'top-right',
        autoClose: false,
        isLoading: true,
      })

      try {
        // Get the encrypted API key
        const encryptedApiKey = localStorage.getItem('openai_key')

        // Call the Electron API to transcribe audio
        const response = await window.electronAPI.transcribeAudio(
          arrayBuffer,
          encryptedApiKey
        )

        // Save transcript
        await this.handleTranscriptReceived(response)

        // Generate and update graph with OpenAI
        const selectedSubject = useSubjectsStore().selectedSubjectId
        if (selectedSubject) {
          await graphForceStore.generateGraphWithOpenAI(response)
        }

        toast.update(processingToast, {
          type: 'success',
          isLoading: false,
          autoClose: 2000,
          render: 'Processed successfully!',
        })
      } catch (err) {
        console.error('❌ Error processing audio:', err)
        this.error = 'Failed to process audio'
        toast.update(processingToast, {
          type: 'error',
          isLoading: false,
          autoClose: 5000,
          render: this.error,
        })
      } finally {
        this.isAudioProcessing = false
      }
    },

    getFileName(path) {
      return path.split('/').pop()
    },
  },
  getters: {
    getTranscripts: (state) => state.transcripts,
    getProcessingProgress: (state) => state.processingProgress,
    isProcessingAudio: (state) => state.isAudioProcessing, // Add new getter
    isProcessingMarkdown: (state) => state.isMarkdownProcessing, // Add new getter
  },
})
