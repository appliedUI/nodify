// electron/preload.cjs
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // ======================
  // Encryption & Security
  // ======================
  encryptData: (data) => ipcRenderer.invoke('encrypt-data', data),
  decryptData: (data) => ipcRenderer.invoke('decrypt-data', data),
  generateHash: (data) => ipcRenderer.invoke('generate-hash', data),
  getOrCreateEncryptionKey: () =>
    ipcRenderer.invoke('get-or-create-encryption-key'),
  setEncryptionKey: (key) => ipcRenderer.invoke('set-encryption-key', key),

  // ======================
  // Application Management
  // ======================
  closeApp: () => ipcRenderer.send('close-app'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // ======================
  // OpenAI Integration
  // ======================
  callOpenAI: (params) => ipcRenderer.invoke('call-openai', params),
  callOpenAIWithAudio: (audioBuffer) =>
    ipcRenderer.invoke('call-openai-with-audio', audioBuffer),
  generateGraphWithOpenAI: (data) =>
    ipcRenderer.invoke('generate-graph-with-openai', data),
  onOpenaiProgress: (callback) => {
    ipcRenderer.on('openai-progress', (event, progress) =>
      callback(event, progress)
    )
  },

  // ======================
  // Transcription Services
  // ======================
  transcribeAudio: (audioBuffer, encryptedApiKey) => {
    return new Promise((resolve, reject) => {
      console.log('📤 Sending audio buffer to main process:', {
        byteLength: audioBuffer.byteLength,
      })

      const buffer = Buffer.from(audioBuffer)
      console.log('Buffer created:', {
        length: buffer.length,
      })

      ipcRenderer
        .invoke('transcribe-audio', {
          audioBuffer: buffer,
          encryptedApiKey,
        })
        .then((transcript) => {
          resolve(transcript)
        })
        .catch((error) => {
          console.error('❌ Transcription failed:', error)
          reject(error)
        })
    })
  },
  fetchYouTubeTranscript: (videoId) =>
    ipcRenderer.invoke('fetch-youtube-transcript', videoId),

  // ======================
  // Content Management
  // ======================
  saveTranscript: (data) => ipcRenderer.invoke('save-transcript', data),
  getTranscript: (subjectId) => ipcRenderer.invoke('get-transcript', subjectId),
  renameSubject: (subjectId, newName) =>
    ipcRenderer.invoke('rename-subject', subjectId, newName),
  generateMarkdownWithOpenAI: ({ encryptedApiKey, transcript, subjectId }) =>
    ipcRenderer.invoke('generate-markdown-with-openai', {
      encryptedApiKey,
      transcript,
      subjectId,
    }),
  exportWorkspaceToFile: (data) => ipcRenderer.invoke('export-workspace-to-file', data),
  importWorkspaceFromFile: () => ipcRenderer.invoke('import-workspace-from-file'),

  // ======================
  // Note Management
  // ======================
  createNote: (noteData) => ipcRenderer.invoke('create-note', noteData),
  getNotesBySubject: (subjectId) =>
    ipcRenderer.invoke('get-notes-by-subject', subjectId),
  updateNoteContent: (noteId, content) =>
    ipcRenderer.invoke('update-note-content', { noteId, content }),
  deleteNote: (noteId) => ipcRenderer.invoke('delete-note', noteId),

  // ======================
  // PDF Management
  // ======================
  downloadPdf: (htmlContent, fileName) =>
    ipcRenderer.invoke('download-pdf', { htmlContent, fileName }),
  openPdf: (filePath) => ipcRenderer.invoke('open-pdf', filePath),

  processPdfTranscript: (data) =>
    ipcRenderer.invoke('process-pdf-transcript', data),

  onPdfProcessingProgress: (callback) => {
    ipcRenderer.on('pdf-processing-progress', (event, progress) =>
      callback(event, progress)
    )
  },

  exportSubjectData: (subjectId) =>
    ipcRenderer.invoke('export-subject-data', { subjectId }),
  exportSubjectToFile: (data) => ipcRenderer.invoke('export-subject', data),
  importSubjectFromFile: () => ipcRenderer.invoke('import-subject'),

  // ======================
  // Meeting Recording
  // ======================
  onFfmpegStopped: (callback) => {
    ipcRenderer.on('ffmpeg-stopped', callback)
    return () => ipcRenderer.off('ffmpeg-stopped', callback)
  },
})

//audio-processing-progress
ipcRenderer.on('audio-processing-progress', (event, progress) => {
  //add this to main process
  ipcMain.emit('audio-processing-progress', progress)
})

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel, data) => {
      const validChannels = [
        'join-meeting',
        'start-ffmpeg-recording',
        'stop-ffmpeg-recording',
        'show-in-folder',
      ]
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data)
      }
    },
    on: (channel, func) => {
      const validChannels = ['ffmpeg-stopped']
      if (validChannels.includes(channel)) {
        ipcRenderer.on(channel, func)
      }
    },
    once: (channel, func) => {
      const validChannels = ['recorder-started', 'recording-error']
      if (validChannels.includes(channel)) {
        ipcRenderer.once(channel, func)
      }
    },
    off: (channel, func) => {
      const validChannels = ['ffmpeg-stopped']
      if (validChannels.includes(channel)) {
        ipcRenderer.off(channel, func)
      }
    },
  },
})
