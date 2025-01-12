// src/stores/notesStore.js
import { defineStore } from 'pinia'
import { db } from '@/db/db'
import { useSubjectsStore } from '@/stores/subjectsStore'

export const useNotesStore = defineStore('notesStore', {
  state: () => ({
    notes: [],
    currentWorkspaceId: null,
  }),
  actions: {
    async setCurrentWorkspace(workspaceId) {
      this.currentWorkspaceId = workspaceId
      await this.fetchNotes()
    },
    async fetchNotes() {
      if (!this.currentWorkspaceId) return
      try {
        this.notes = await db.notes
          .where('workspaceId')
          .equals(this.currentWorkspaceId)
          .reverse()
          .sortBy('createdAt')
      } catch (error) {
        console.error('Error fetching notes:', error)
        this.notes = []
      }
    },
    async createNote(content) {
      if (!this.currentWorkspaceId) throw new Error('No workspace selected')

      const note = await db.notes.add({
        workspaceId: this.currentWorkspaceId,
        content,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Fetch the created note and update the store
      const createdNote = await db.notes.get(note)
      await this.fetchNotes() // Refresh the notes list
      return createdNote
    },
    async updateNote(noteId, content) {
      const updatedNote = await db.notes.update(noteId, {
        content,
        updatedAt: new Date(),
      })

      // Refresh notes after update
      await this.fetchNotes()
      return updatedNote
    },
    async deleteNote(noteId) {
      await db.notes.delete(noteId)
      await this.fetchNotes()
    },
    async saveNote(content) {
      if (!content?.trim()) return null
      if (!this.currentWorkspaceId) throw new Error('No workspace selected')

      // Check for duplicate content
      if (await this.isDuplicateContent(content)) {
        console.log('Duplicate content detected, skipping save')
        return null
      }

      return this.createNote(content)
    },
    async isDuplicateContent(content) {
      if (!this.currentWorkspaceId) return false

      const existingNote = await db.notes
        .where('workspaceId')
        .equals(this.currentWorkspaceId)
        .filter((note) => note.content === content)
        .first()

      return !!existingNote
    },
    async sendMarkdown(newContent) {
      try {
        if (!this.currentWorkspaceId) {
          throw new Error('No workspace selected')
        }

        if (!newContent?.trim()) {
          return null
        }

        // Get the most recent note for this workspace
        const existingNotes = await db.notes
          .where('workspaceId')
          .equals(this.currentWorkspaceId)
          .reverse()
          .sortBy('createdAt')

        const existingNote = existingNotes[0]

        if (existingNote) {
          // Add new content at the top with a newline
          const updatedContent =
            newContent.trim() + '\n\n' + existingNote.content.trim()
          const note = await this.updateNote(existingNote.id, updatedContent)
          await this.fetchNotes() // Refresh notes after update
          return note
        }

        // If no existing note, create a new one
        const note = await this.createNote(newContent)
        await this.fetchNotes() // Refresh notes after create
        return note
      } catch (error) {
        console.error('Error in sendMarkdown:', error)
        throw error
      }
    },
  },
})
