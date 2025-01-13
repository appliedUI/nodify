import { defineStore } from 'pinia'
import { useSubjectsStore } from './subjectsStore'
import { db } from '@/db/db'
import { pdfToMarkdown } from '@/utils/pdfProcessor'
import { useGraphForceStore } from '@/stores/graphForceStore'

const graphForceStore = useGraphForceStore()

export const usePDFStore = defineStore('pdf', {
  state: () => ({
    isProcessing: false,
    processingProgress: null,
    pdfContent: null,
    markdownContent: null,
    error: null,
    currentFileId: null,
  }),
  actions: {
    async processPDF(file, subjectId) {
      this.isProcessing = true
      this.error = null
      this.currentFileId = file.name
      console.log('[PDF Store] Starting PDF processing')

      try {
        // Process PDF to markdown
        const markdown = await pdfToMarkdown(file, (progress) => {
          this.processingProgress = {
            ...progress,
            type: 'pdf',
            isComplete: false
          }
        })

        // Update progress to show waiting for graph generation
        this.processingProgress = {
          percent: 100,
          message: 'PDF processed, generating graph...',
          type: 'pdf',
          isComplete: false
        }

        console.log('[PDF Store] PDF processing completed')
        this.markdownContent = markdown.markdown
        this.pdfContent = markdown.text

        // Generate the graph
        const subjectsStore = useSubjectsStore()
        
        // Set up OpenAI progress listener
        window.electronAPI.onOpenaiProgress((event, progress) => {
          // Update PDF progress to show graph generation progress
          this.processingProgress = {
            percent: 100,
            message: `Generating graph... ${Math.round(progress.progress * 100)}%`,
            type: 'pdf',
            isComplete: false
          }
          graphForceStore.updateProgress(progress)
        })

        graphForceStore.setGraphLoading(true)
        const graphData = await window.electronAPI.generateGraphWithOpenAI({
          apiKey: localStorage.getItem('openai_key'),
          transcript: markdown.text,
          subjectId: subjectId,
        })
        await subjectsStore.setGraph(graphData)

        // Save to database
        const savedPDF = await db.savePDF({
          subjectId,
          content: markdown.text,
          markdownContent: markdown.markdown,
        })

        // Final completion state
        this.processingProgress = {
          percent: 100,
          message: 'Processing complete',
          type: 'pdf',
          isComplete: true
        }

        console.log('[PDF Store] PDF saved to database:', savedPDF)
        return markdown.markdown
      } catch (error) {
        console.error('[PDF Store] Processing error:', error)
        this.error = error
        throw error
      } finally {
        // Only clear states after a delay to show completion
        setTimeout(() => {
          this.isProcessing = false
          this.currentFileId = null
          this.processingProgress = null
        }, 1000)
      }
    },

    async getPDFsForSubject(subjectId) {
      try {
        return await db.getPDFsBySubject(subjectId)
      } catch (error) {
        console.error('[PDF Store] Error fetching PDFs:', error)
        throw error
      }
    },

    async deletePDF(id) {
      try {
        await db.deletePDF(id)
        this.clearPDF()
        this.clearMarkdown()
      } catch (error) {
        console.error('[PDF Store] Error deleting PDF:', error)
        throw error
      }
    },

    clearPDF() {
      this.pdfContent = null
      this.markdownContent = null
    },

    clearMarkdown() {
      this.pdfContent = null
      this.markdownContent = null
      this.currentFileId = null
    },
  },
  getters: {
    getPDFContent: (state) => state.pdfContent,
    getMarkdownContent: (state) => state.markdownContent,
    isProcessingPDF: (state) => state.isProcessing,
  },
})
