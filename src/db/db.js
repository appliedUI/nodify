import Dexie from 'dexie'
import { UserModel } from '@/models/UserModel'
import { WorkspaceModel } from '@/models/WorkspaceModel'
import { UserWorkspaceModel } from '@/models/UserWorkspaceModel'
import { SubjectModel } from '@/models/SubjectModel'
import { NotesModel } from '@/models/NotesModel'
import { PDFModel } from '@/models/PDFModel'

class AppDatabase extends Dexie {
  constructor() {
    super('notifyappDB')
    this.version(16).stores({
      // Added history field to users table
      users: UserModel.schema,
      workspaces: WorkspaceModel.schema,
      workspaceUsers:
        '++id, userId, workspaceId, role, joinedAt, [userId+workspaceId]',
      subjects:
        '++id, name, workspaceId, createdAt, graph, graphState, transcript, markdownTranscript, youtubeUrl',
      notes: '++id, workspaceId, content, createdAt, updatedAt', // Updated to use workspaceId
      pdfs: PDFModel.schema,
    })

    this.users.mapToClass(UserModel)
    this.workspaces.mapToClass(WorkspaceModel)
    this.workspaceUsers.mapToClass(UserWorkspaceModel)
    this.subjects.mapToClass(SubjectModel)
    this.notes.mapToClass(NotesModel)
    this.pdfs.mapToClass(PDFModel)
  }

  async getAllWorkspacesForUser(userId) {
    try {
      // First get all workspace IDs for this user from workspaceUsers table
      const workspaceUsers = await this.workspaceUsers
        .where('userId')
        .equals(parseInt(userId))
        .toArray()

      // Extract workspace IDs
      const workspaceIds = workspaceUsers.map((wu) => wu.workspaceId)

      // Get all workspaces with matching IDs
      const workspaces = await this.workspaces
        .where('id')
        .anyOf(workspaceIds)
        .toArray()

      console.log('Found workspaces:', workspaces)
      return workspaces
    } catch (error) {
      console.error('Error fetching workspaces:', error)
      throw error
    }
  }

  async createWorkspaceWithUser(workspaceData, userId) {
    try {
      const workspaceId = await this.workspaces.add({
        name: workspaceData.name,
        description: workspaceData.description,
        status: 'active',
        createdAt: new Date(),
      })

      await this.workspaceUsers.add({
        workspaceId,
        userId: parseInt(userId),
        role: 'owner',
        joinedAt: new Date(),
      })

      return workspaceId
    } catch (error) {
      console.error('Error creating workspace:', error)
      throw error
    }
  }

  async saveUserEmail(email) {
    await this.users.put({ id: 1, email })
  }

  async getUserEmail() {
    const user = await this.users.get(1)
    return user ? user.email : null
  }

  async createSubject(subjectData) {
    try {
      // Log the data being saved
      console.log('Creating subject with data:', subjectData)

      const id = await this.subjects.add(subjectData)
      const savedSubject = await this.subjects.get(id)

      // Verify the save
      console.log('Saved subject:', savedSubject)

      return savedSubject
    } catch (error) {
      console.error('Error creating subject in DB:', error)
      throw error
    }
  }

  async deleteSubject(id) {
    try {
      await this.subjects.delete(id)
    } catch (error) {
      console.error('Error deleting subject in DB:', error)
      throw error
    }
  }

  async updateSubjectGraph(subjectId, graph) {
    try {
      // Clear existing graph before updating
      await this.subjects.update(subjectId, { graph: {} })

      // Update with new graph
      await this.subjects.update(subjectId, { graph })

      // Verify the update
      const updated = await this.subjects.get(subjectId)
      console.log('Updated subject graph:', updated.graph)
    } catch (error) {
      console.error('Error updating subject graph in DB:', error)
      throw error
    }
  }

  async updateSubjectGraphState(subjectId, graphState) {
    try {
      await this.subjects.update(subjectId, { graphState })

      // Verify the update
      const updated = await this.subjects.get(subjectId)
      console.log('Updated subject graph state:', updated.graphState)
    } catch (error) {
      console.error('Error updating subject graph state in DB:', error)
      throw error
    }
  }

  async updateSubjectTranscript(subjectId, transcript) {
    try {
      console.log('DB: Starting transcript update for subject:', subjectId)

      // First verify subject exists
      const subject = await this.subjects.get(subjectId)
      if (!subject) {
        throw new Error(`Subject ${subjectId} not found`)
      }

      // Perform update
      await this.subjects.update(subjectId, { transcript })

      // Verify update
      const updated = await this.subjects.get(subjectId)
      if (!updated || updated.transcript !== transcript) {
        throw new Error('Transcript update verification failed')
      }

      console.log('DB: Transcript update successful:', {
        subjectId,
        transcript: updated.transcript,
      })

      return updated
    } catch (error) {
      console.error('DB: Error updating transcript:', error)
      throw error
    }
  }

  async updateMarkdownTranscript(subjectId, markdownTranscript) {
    try {
      console.log(
        'DB: Starting markdown transcript update for subject:',
        subjectId
      )

      // Verify subject exists
      const subject = await this.subjects.get(subjectId)
      if (!subject) {
        throw new Error(`Subject ${subjectId} not found`)
      }

      // Perform update
      await this.subjects.update(subjectId, { markdownTranscript })

      // Verify update
      const updated = await this.subjects.get(subjectId)
      if (!updated || updated.markdownTranscript !== markdownTranscript) {
        throw new Error('Markdown transcript update verification failed')
      }

      console.log('DB: Markdown transcript update successful:', {
        subjectId,
        markdownTranscript: updated.markdownTranscript,
      })

      return updated
    } catch (error) {
      console.error('DB: Error updating markdown transcript:', error)
      throw error
    }
  }

  async updateSubjectYoutubeUrl(subjectId, url) {
    try {
      console.log('Updating YouTube URL for subject:', { subjectId, url })
      await this.subjects.update(subjectId, { youtubeUrl: url })
      const updatedSubject = await this.subjects.get(subjectId)
      console.log('Updated subject:', updatedSubject)
      return updatedSubject
    } catch (error) {
      console.error('Error updating YouTube URL:', error)
      throw error
    }
  }

  async getSubjectYoutubeUrl(subjectId) {
    try {
      const subject = await this.subjects.get(subjectId)
      return subject?.youtubeUrl || null
    } catch (error) {
      console.error('Error getting YouTube URL:', error)
      return null
    }
  }

  async getNotesBySubject(subjectId) {
    try {
      return await this.notes.where('subjectId').equals(subjectId).toArray()
    } catch (error) {
      console.error('Error fetching notes:', error)
      throw error
    }
  }

  async createNote(noteData) {
    try {
      const id = await this.notes.add(noteData)
      return await this.notes.get(id)
    } catch (error) {
      console.error('Error creating note:', error)
      throw error
    }
  }

  async updateNoteContent(noteId, content) {
    try {
      await this.notes.update(noteId, {
        content,
        updatedAt: new Date(),
      })
      return await this.notes.get(noteId)
    } catch (error) {
      console.error('Error updating note:', error)
      throw error
    }
  }

  async deleteNote(noteId) {
    try {
      await this.notes.delete(noteId)
    } catch (error) {
      console.error('Error deleting note:', error)
      throw error
    }
  }

  async savePDF(pdfData) {
    try {
      const id = await this.pdfs.add(new PDFModel(pdfData))
      return await this.pdfs.get(id)
    } catch (error) {
      console.error('Error saving PDF:', error)
      throw error
    }
  }

  async getPDFsBySubject(subjectId) {
    try {
      return await this.pdfs.where('subjectId').equals(subjectId).toArray()
    } catch (error) {
      console.error('Error fetching PDFs:', error)
      throw error
    }
  }

  async deletePDF(id) {
    try {
      await this.pdfs.delete(id)
    } catch (error) {
      console.error('Error deleting PDF:', error)
      throw error
    }
  }
}

export const db = new AppDatabase()

// Ensure database is open
db.open().catch((err) => {
  console.error('Failed to open db:', err.stack)
})

// Add utility method to help debug schema issues
db.on('ready', () => {
  console.log('Database schemas:', {
    users: db.users.schema.indexes,
    workspaces: db.workspaces.schema.indexes,
    subjects: db.subjects.schema.indexes,
  })
})
