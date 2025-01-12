import { defineStore } from 'pinia'
import { nextTick } from 'vue'
import { db } from '@/db/db'
import { useAudioStore } from '@/stores/audioStore'
import { useUserStore } from '@/stores/userStore'
import { SubjectModel } from '@/models/SubjectModel'

export const useSubjectsStore = defineStore('subjects', {
  state: () => ({
    graphAdded: false,
    subjects: [],
    selectedSubjectId:
      parseInt(localStorage.getItem('selectedSubjectId')) || null,
    graph: JSON.parse(localStorage.getItem('graph')) || {},
    graphState: JSON.parse(localStorage.getItem('graphState')) || null,
    OpenAIKeyState: false,
  }),

  getters: {
    sortedSubjects: (state) => {
      return [...state.subjects].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      )
    },
    currentSubject: (state) => {
      return state.subjects.find((s) => s.id === state.selectedSubjectId)
    },
    currentSubjectGraph: (state) => {
      return state.graph
    },
  },

  actions: {
    async setOpenAIKey(value) {
      this.OpenAIKeyState = value
    },
    //process the transcript with openai to markdown
    async processTranscript(transcript) {
      try {
        const encryptedApiKey = localStorage.getItem('openai_key')
        const subjectId = this.selectedSubjectId

        // Split transcript into chunks of ~6000 tokens (leaving room for system message)
        const chunkSize = 6000
        const chunks = []
        let currentChunk = ''

        // Simple splitting by words (could be improved)
        const words = transcript.split(' ')
        for (const word of words) {
          if ((currentChunk + word).length > chunkSize) {
            chunks.push(currentChunk)
            currentChunk = ''
          }
          currentChunk += word + ' '
        }
        if (currentChunk) chunks.push(currentChunk)

        // Process each chunk
        let fullMarkdown = ''
        for (const [index, chunk] of chunks.entries()) {
          const response = await window.electronAPI.generateMarkdownWithOpenAI({
            encryptedApiKey,
            transcript: chunk,
            subjectId,
            isFirstChunk: index === 0,
            isLastChunk: index === chunks.length - 1,
          })
          fullMarkdown += response.transcript.text + '\n\n'
        }

        await db.updateMarkdownTranscript(subjectId, fullMarkdown)
        return fullMarkdown
      } catch (error) {
        console.error('Error processing transcript:', error)
        throw error
      }
    },

    //save the graph to the subject
    async setGraph(graphData) {
      this.graph = graphData
      localStorage.setItem('graph', JSON.stringify(graphData))
      await db.subjects.update(this.selectedSubjectId, { graph: graphData })
    },

    // Add a method to fetch subjects
    async fetchSubjects() {
      const workspaceId = localStorage.getItem('workspaceUUID')
      if (!workspaceId) {
        this.subjects = []
        return
      }

      try {
        this.subjects = await db.subjects
          .where('workspaceId')
          .equals(parseInt(workspaceId))
          .toArray()

        // Clear selection if selected subject is not in current workspace
        if (
          this.selectedSubjectId &&
          !this.subjects.find((s) => s.id === this.selectedSubjectId)
        ) {
          this.clearSelection()
        }
      } catch (error) {
        console.error('Error fetching subjects:', error)
        throw error
      }
    },

    async createSubject(name) {
      try {
        const userStore = useUserStore()
        const user = await userStore.fetchUser()
        if (!user || !user.id) throw new Error('No user found')

        const workspaceId = localStorage.getItem('workspaceUUID')
        if (!workspaceId) throw new Error('No workspace selected')

        const defaultGraphState = {
          transform: { x: 0, y: 0, k: 1 },
          openPanels: [],
          selectedNodeId: null,
          nodePositions: {},
          controls: {
            linkDistance: 300,
            chargeStrength: 0,
            edgeCurvature: 0,
            collideRadius: 60,
          },
        }

        const subject = new SubjectModel({
          name,
          workspaceId: parseInt(workspaceId),
          createdAt: new Date().toISOString(),
          graph: {},
          graphState: defaultGraphState,
          transcript: '', // Initialize with empty string
          markdownTranscript: '',
          youtubeUrl: ''
        })

        const id = await db.subjects.add(subject)
        
        // Record this action in user history
        const historyItem = {
          action: 'create_subject',
          subjectName: name,
          timestamp: new Date().toISOString(),
          details: `Subject: ${name}`
        }

        await db.users.where('id').equals(user.id).modify(userData => {
          if (!userData.history) userData.history = []
          userData.history.push(historyItem)
        })

        // Update local user store
        await userStore.fetchUser()

        // Ensure subject is fully created before continuing
        await this.fetchSubjects()
        
        // Set as current subject
        this.selectedSubjectId = id
        localStorage.setItem('selectedSubjectId', id)

        // Verify subject is accessible
        const verifySubject = await db.subjects.get(id)
        console.log('Subject created and verified:', verifySubject)

        return id
      } catch (error) {
        console.error('Error creating subject:', error)
        throw error
      }
    },

    // Update deleteSubject to handle cleanup
    async deleteSubject(id) {
      try {
        const userStore = useUserStore()
        const user = await userStore.fetchUser()
        if (!user || !user.id) throw new Error('No user found')

        // Get subject details before deletion
        const subject = await db.subjects.get(id)
        if (!subject) throw new Error('Subject not found')

        // Delete the subject
        await db.subjects.delete(id)
        
        // Record this action in user history
        const historyItem = {
          action: 'delete_subject',
          subjectName: subject.name,
          timestamp: new Date().toISOString(),
          details: `Deleted subject: ${subject.name}`
        }

        await db.users.where('id').equals(user.id).modify(userData => {
          if (!userData.history) userData.history = []
          userData.history.push(historyItem)
        })

        // Update local user store
        await userStore.fetchUser()

        // Update local state
        this.subjects = this.subjects.filter((s) => s.id !== id)
        if (this.selectedSubjectId === id) {
          this.selectedSubjectId = null
          localStorage.removeItem('selectedSubjectId')
        }

        return true
      } catch (error) {
        console.error('Error deleting subject:', error)
        throw error
      }
    },

    async setSelectedSubject(subject) {
      try {
        // 1. Set basic subject info
        this.selectedSubjectId = subject.id
        localStorage.setItem('selectedSubjectId', subject.id.toString())
        localStorage.setItem(
          'selectedSubjectWorkspaceId',
          subject.workspaceId.toString()
        )

        // 2. Clear any stale data first
        this.graph = null
        this.graphState = null
        localStorage.removeItem('graph')
        localStorage.removeItem('graphState')

        // 3. Fetch fresh subject data from DB to ensure latest state
        const freshSubject = await db.subjects.get(subject.id)
        if (!freshSubject) {
          console.warn('Subject not found in DB:', subject.id)
          return
        }

        // 4. Handle graph data
        if (freshSubject.graph && Object.keys(freshSubject.graph).length > 0) {
          this.graph = freshSubject.graph
          localStorage.setItem('graph', JSON.stringify(freshSubject.graph))
        }

        // 5. Handle graph state
        if (freshSubject.graphState) {
          this.graphState = freshSubject.graphState
          localStorage.setItem(
            'graphState',
            JSON.stringify(freshSubject.graphState)
          )
        } else {
          // Create default graph state if none exists
          const defaultGraphState = {
            transform: { x: 0, y: 0, k: 1 },
            openPanels: [],
            selectedNodeId: null,
            nodePositions: {},
            controls: {
              linkDistance: 200,
              chargeStrength: 0,
              edgeCurvature: 0,
              collideRadius: 60,
            },
          }
          this.graphState = defaultGraphState
          localStorage.setItem('graphState', JSON.stringify(defaultGraphState))
        }
      } catch (error) {
        console.error('Error in setSelectedSubject:', error)
        // Reset state on error
        this.graph = null
        this.graphState = null
        localStorage.removeItem('graph')
        localStorage.removeItem('graphState')
      }
    },

    // Update clearSelection to handle cleanup
    clearSelection() {
      this.selectedSubjectId = null
      this.graph = {}
      this.graphState = null
      localStorage.removeItem('selectedSubjectId')
      localStorage.removeItem('selectedSubjectWorkspaceId')
      localStorage.removeItem('graph')
      localStorage.removeItem('graphState')
    },

    async fetchGraph() {
      const graph = JSON.parse(localStorage.getItem('graph'))
      if (graph) {
        this.graph = graph
        // Also ensure graphState is loaded
        await this.loadGraphState()
      }
    },

    // Create graph
    async addGraph(graphData) {
      try {
        const subject = this.currentSubject
        if (!subject) throw new Error('No subject selected')

        // Update store state first
        this.graph = graphData.graph
        this.graphAdded = false
        await nextTick()
        this.graphAdded = true

        // Update both local storage and database
        localStorage.setItem('graph', JSON.stringify(graphData.graph))
        await db.subjects.update(subject.id, { graph: graphData.graph })

        // Log to verify saving
        console.log('Saved graph:', graphData.graph, 'for subject:', subject.id)
      } catch (error) {
        console.error('Error adding graph:', error)
        throw error
      }
    },

    removeSubjectFromLocalStorage(id) {
      let subjects = JSON.parse(localStorage.getItem('subjects')) || []
      subjects = subjects.filter((subject) => subject.id !== id)
      localStorage.setItem('subjects', JSON.stringify(subjects))
    },

    async loadGraphState() {
      try {
        const subject = this.currentSubject
        if (!subject) return null

        console.log('Loading graph state for subject:', subject.id)

        let state = null
        if (subject.graphState) {
          state = subject.graphState
          console.log('Found graph state in subject:', state)
        } else {
          state = {
            transform: { x: 0, y: 0, k: 1 },
            openPanels: [],
            selectedNodeId: null,
            nodePositions: {},
            controls: {
              linkDistance: 200,
              chargeStrength: 0,
              edgeCurvature: 0,
              collideRadius: 60,
            },
          }
          console.log('Created default state:', state)
        }

        this.graphState = state
        localStorage.setItem('graphState', JSON.stringify(state))

        return state
      } catch (error) {
        console.error('Error loading graph state:', error)
        return null
      }
    },

    async saveGraphState(state) {
      try {
        const subject = this.currentSubject
        if (!subject) return

        const cleanState = {
          transform: {
            x: Number(state.transform?.x) || 0,
            y: Number(state.transform?.y) || 0,
            k: Number(state.transform?.k) || 1,
          },
          nodePositions: {},
          controls: {
            linkDistance: Number(state.controls?.linkDistance) || 200,
            chargeStrength: Number(state.controls?.chargeStrength) || -300,
            edgeCurvature: Number(state.controls?.edgeCurvature) || 0,
            collideRadius: Number(state.controls?.collideRadius) || 60,
          },
        }

        // Clean up nodePositions
        if (state.nodePositions) {
          Object.entries(state.nodePositions).forEach(([key, pos]) => {
            if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
              cleanState.nodePositions[key] = {
                x: pos.x,
                y: pos.y,
                fx: typeof pos.fx === 'number' ? pos.fx : null,
                fy: typeof pos.fy === 'number' ? pos.fy : null,
              }
            }
          })
        }

        this.graphState = cleanState
        localStorage.setItem('graphState', JSON.stringify(cleanState))
        await db.subjects.update(subject.id, { graphState: cleanState })

        // Only log in development
        if (process.env.NODE_ENV === 'development') {
          console.log('Saved graph state for subject:', subject.id)
        }
      } catch (error) {
        console.error('Error saving graph state:', error)
      }
    },

    watchLocalStorageChanges() {
      window.addEventListener('storage', (event) => {
        if (event.key === 'graphState') {
          const newState = JSON.parse(event.newValue)
          this.saveGraphState(newState)
        }
      })
    },

    async updateTranscript(subjectId, transcript) {
      try {
        // Ensure subject exists
        const subject = await db.subjects.get(subjectId)
        if (!subject) {
          throw new Error(`Subject ${subjectId} not found`)
        }

        // Update in database
        await db.updateSubjectTranscript(subjectId, transcript)

        // Update local state
        const localSubject = this.subjects.find((s) => s.id === subjectId)
        if (localSubject) {
          localSubject.transcript = transcript
          // Force reactivity
          this.subjects = [...this.subjects]
        }

        console.log('Transcript updated for subject:', subjectId)
        return transcript // Return the transcript as a string
      } catch (error) {
        console.error('Error updating transcript:', error)
        throw error
      }
    },

    // Add a method to fetch graph by subject ID
    async fetchGraphBySubjectId(subjectId) {
      try {
        const subject = await db.subjects.get(subjectId)
        if (!subject) {
          throw new Error(`Subject ${subjectId} not found`)
        }

        this.graph = subject.graph || {}
        localStorage.setItem('graph', JSON.stringify(this.graph))

        console.log('Fetched graph for subject:', subjectId)
        return this.graph
      } catch (error) {
        console.error('Error fetching graph by subject ID:', error)
        throw error
      }
    },

    // Add a method to verify transcript
    async verifyTranscript(subjectId) {
      try {
        const subject = this.subjects.find((s) => s.id === subjectId)
        const dbSubject = await db.subjects.get(subjectId)

        console.log('Store transcript:', subject?.transcript)
        console.log('DB transcript:', dbSubject?.transcript)

        return {
          inStore: subject?.transcript,
          inDB: dbSubject?.transcript,
        }
      } catch (error) {
        console.error('Error verifying transcript:', error)
        throw error
      }
    },

    async renameSubject(subjectId, newName) {
      try {
        const userStore = useUserStore()
        const user = await userStore.fetchUser()
        if (!user || !user.id) throw new Error('No user found')

        // Get current subject
        const subject = await db.subjects.get(subjectId)
        if (!subject) throw new Error('Subject not found')

        const oldName = subject.name

        // Update the subject
        await db.subjects.update(subjectId, { name: newName })
        
        // Record this action in user history
        const historyItem = {
          action: 'rename_subject',
          subjectName: newName,
          timestamp: new Date().toISOString(),
          details: `Renamed subject from "${oldName}" to "${newName}"`
        }

        await db.users.where('id').equals(user.id).modify(userData => {
          if (!userData.history) userData.history = []
          userData.history.push(historyItem)
        })

        // Update local user store
        await userStore.fetchUser()

        // Update local state
        const index = this.subjects.findIndex((s) => s.id === subjectId)
        if (index !== -1) {
          this.subjects[index] = { ...this.subjects[index], name: newName }
        }

        return true
      } catch (error) {
        console.error('Error renaming subject:', error)
        throw error
      }
    },

    async fetchMarkdownTranscript(subjectId) {
      try {
        const subject = await db.subjects.get(subjectId)
        if (!subject) {
          throw new Error(`Subject ${subjectId} not found`)
        }
        return subject.markdownTranscript || ''
      } catch (error) {
        console.error('Error fetching markdown transcript:', error)
        throw error
      }
    },

    async fetchTranscript(subjectId) {
      try {
        // Check localStorage first
        const cached = JSON.parse(localStorage.getItem('transcripts') || '{}')[
          subjectId
        ]
        if (cached) return cached

        // Fallback to DB
        const subject = await db.subjects.get(subjectId)
        if (!subject) throw new Error('Subject not found')

        const transcript =
          subject.transcript ||
          subject.graph?.transcript?.text ||
          (await useAudioStore.getTranscriptsBySubjectId(subjectId))

        if (transcript) {
          // Cache in localStorage
          const transcripts = JSON.parse(
            localStorage.getItem('transcripts') || '{}'
          )
          transcripts[subjectId] = transcript
          localStorage.setItem('transcripts', JSON.stringify(transcripts))
        }

        return transcript
      } catch (error) {
        console.error('Error fetching transcript:', error)
        throw error
      }
    },

    async syncTranscripts() {
      try {
        const subjects = await db.subjects.toArray()
        const transcripts = subjects.reduce((acc, subject) => {
          if (subject.transcript) {
            acc[subject.id] = subject.transcript
          }
          return acc
        }, {})

        localStorage.setItem('transcripts', JSON.stringify(transcripts))
      } catch (error) {
        console.error('Error syncing transcripts:', error)
      }
    },
  },
})
