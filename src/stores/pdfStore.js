import { defineStore } from 'pinia'
import { useSubjectsStore } from './subjectsStore'
import { db } from '@/db/db'
import { pdfToMarkdown } from '@/utils/pdfProcessor'

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
        const markdown = await pdfToMarkdown(file, (progress) => {
          this.processingProgress = progress
        })

        console.log('[PDF Store] PDF processing completed')
        this.markdownContent = markdown.markdown
        this.pdfContent = markdown.text

        // Generate the graph
        const subjectsStore = useSubjectsStore()
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

        console.log('[PDF Store] PDF saved to database:', savedPDF)
        return markdown.markdown
      } catch (error) {
        console.error('[PDF Store] Processing error:', error)
        this.error = error
        throw error
      } finally {
        this.isProcessing = false
        this.currentFileId = null // Clear the current file ID after processing
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
