// ========================
// IMPORTS & CONFIGURATION
// ========================
// IMPORTANT: This must be the very first import from openai package
require('openai/shims/node')

const {
  app,
  BrowserWindow,
  protocol,
  ipcMain,
  session,
  shell,
  dialog,
  desktopCapturer,
  screen,
} = require('electron')
const path = require('path')
const OpenAI = require('openai')
const axios = require('axios')
const FormData = require('form-data')
const openaiHelper = require('./helpers/openaiHelper.cjs')
const { TranscriptionService } = require('./helpers/transcriptionService.cjs')
const puppeteer = require('puppeteer')
const fs = require('fs').promises
const fsSync = require('fs')
const http = require('http')
const { fetchTranscriptYT } = require('./youtubeTranscriptYtDlp.cjs')
const { fetchTranscriptTimedtext } = require('./youtubeTranscriptTimedtext.cjs')

// Helper function to resolve paths in both dev and prod
const resolveAssetPath = (assetPath) => {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'assets', assetPath)
  }
  return path.join(__dirname, '..', assetPath)
}

// ========================
// SERVICE INITIALIZATION
// ========================
let encryptionService
let hashGenerator
let transcriptionService

const setupServices = () => {
  const encryptPath = resolveAssetPath('encrypt/encryptionService.cjs')
  const hashPath = resolveAssetPath('encrypt/generateHash.cjs')

  encryptionService = require(encryptPath)
  hashGenerator = require(hashPath)

  // Initialize encryption key on startup
  encryptionService.getOrCreateEncryptionKey()

  // Configure FFmpeg paths based on platform
  const ffmpeg = require('fluent-ffmpeg')
  const platform = process.platform
  const ffmpegFileName = platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  const ffprobeFileName = platform === 'win32' ? 'ffprobe.exe' : 'ffprobe'

  let platformDir
  switch (platform) {
    case 'win32':
      platformDir = 'win'
      break
    case 'darwin':
      platformDir = 'mac'
      break
    case 'linux':
      platformDir = 'linux'
      break
    default:
      throw new Error(`Unsupported platform: ${platform}`)
  }

  if (process.env.NODE_ENV === 'production') {
    const ffmpegPath = path.join(
      process.resourcesPath,
      'ffmpeg',
      ffmpegFileName
    )
    const ffprobePath = path.join(
      process.resourcesPath,
      'ffprobe',
      ffprobeFileName
    )
    ffmpeg.setFfmpegPath(ffmpegPath)
    ffmpeg.setFfprobePath(ffprobePath)
  } else {
    const ffmpegPath = path.join(
      __dirname,
      '..',
      'resources',
      'ffmpeg',
      platformDir,
      ffmpegFileName
    )
    const ffprobePath = path.join(
      __dirname,
      '..',
      'resources',
      'ffprobe',
      platformDir,
      ffprobeFileName
    )
    ffmpeg.setFfmpegPath(ffmpegPath)
    ffmpeg.setFfprobePath(ffprobePath)
  }
}

// ========================
// WINDOW MANAGEMENT
// ========================
const isDev = process.env.NODE_ENV === 'development'

// Local server for production (needed for YouTube iframes to work)
let localServer = null
let localServerPort = null

// MIME types for serving static files
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
}

// Start local HTTP server for production
function startLocalServer() {
  return new Promise((resolve, reject) => {
    const distPath = path.join(app.getAppPath(), 'dist')
    
    localServer = http.createServer((req, res) => {
      let filePath = path.join(distPath, req.url === '/' ? 'index.html' : req.url)
      
      // Handle query strings
      const queryIndex = filePath.indexOf('?')
      if (queryIndex !== -1) {
        filePath = filePath.substring(0, queryIndex)
      }
      
      const ext = path.extname(filePath).toLowerCase()
      const contentType = mimeTypes[ext] || 'application/octet-stream'
      
      fsSync.readFile(filePath, (err, content) => {
        if (err) {
          if (err.code === 'ENOENT') {
            // For SPA, serve index.html for non-existent paths
            fsSync.readFile(path.join(distPath, 'index.html'), (err2, indexContent) => {
              if (err2) {
                res.writeHead(500)
                res.end('Error loading index.html')
              } else {
                res.writeHead(200, { 'Content-Type': 'text/html' })
                res.end(indexContent)
              }
            })
          } else {
            res.writeHead(500)
            res.end(`Server Error: ${err.code}`)
          }
        } else {
          res.writeHead(200, { 'Content-Type': contentType })
          res.end(content)
        }
      })
    })
    
    // Find available port starting from 54321
    const tryPort = (port) => {
      localServer.listen(port, '127.0.0.1', () => {
        localServerPort = port
        console.log(`[Local Server] Production server running at http://127.0.0.1:${port}`)
        resolve(port)
      }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          tryPort(port + 1)
        } else {
          reject(err)
        }
      })
    }
    
    tryPort(54321)
  })
}

async function createWindow() {
  // Start local server for production
  if (!isDev) {
    await startLocalServer()
  }

  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    title: 'Notify',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: true,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  })

  // Set permission handler for YouTube iframe embedding
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'display-capture', 'mediaKeySystem', 'clipboard-read', 'clipboard-write', 'fullscreen']
    if (allowedPermissions.includes(permission)) {
      callback(true)
    } else {
      callback(false)
    }
  })

  // Allow YouTube iframes to load properly
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    return true
  })

  // Set proper Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          isDev
            ? `
              default-src 'self';
              script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* https://www.youtube.com https://*.ytimg.com https://www.google.com https://www.gstatic.com https://*.googleapis.com https://*.doubleclick.net;
              style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
              connect-src 'self' http://localhost:* ws://localhost:* ws://127.0.0.1:* https://*.youtube.com https://*.googlevideo.com https://*.googleapis.com https://www.google.com https://*.doubleclick.net https://s.youtube.com https://i.ytimg.com https://yt3.ggpht.com https://play.google.com https://*.g.doubleclick.net https://googleads.g.doubleclick.net https://static.doubleclick.net;
              img-src 'self' data: http://localhost:* https://*.ytimg.com https://*.youtube.com https://*.ggpht.com https://www.gstatic.com https://*.doubleclick.net https://via.placeholder.com https://*.gravatar.com;
              font-src 'self' https://fonts.gstatic.com data: https://fonts.googleapis.com;
              object-src 'none';
              base-uri 'self';
              form-action 'self';
              frame-src 'self' https://www.youtube.com https://*.youtube.com https://*.doubleclick.net https://googleads.g.doubleclick.net;
              child-src 'self' https://www.youtube.com https://*.youtube.com blob:;
              media-src 'self' https://*.googlevideo.com blob:;
              worker-src 'self' blob:;
              block-all-mixed-content;
              upgrade-insecure-requests;
            `
            : `
              default-src 'self';
              script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://*.ytimg.com https://www.google.com https://www.gstatic.com https://*.googleapis.com https://*.doubleclick.net;
              style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
              connect-src 'self' https://*.youtube.com https://*.googlevideo.com https://*.googleapis.com https://www.google.com https://*.doubleclick.net https://s.youtube.com https://i.ytimg.com https://yt3.ggpht.com https://play.google.com https://*.g.doubleclick.net https://googleads.g.doubleclick.net https://static.doubleclick.net;
              img-src 'self' data: https://*.ytimg.com https://*.youtube.com https://*.ggpht.com https://www.gstatic.com https://*.doubleclick.net https://via.placeholder.com https://*.gravatar.com;
              font-src 'self' https://fonts.gstatic.com data: https://fonts.googleapis.com;
              object-src 'none';
              base-uri 'self';
              form-action 'self';
              frame-src 'self' https://www.youtube.com https://*.youtube.com https://*.doubleclick.net https://googleads.g.doubleclick.net;
              child-src 'self' https://www.youtube.com https://*.youtube.com blob:;
              media-src 'self' https://*.googlevideo.com blob:;
              worker-src 'self' blob:;
              block-all-mixed-content;
              upgrade-insecure-requests;
            `,
        ],
      },
    })
  })

  // load dev or production index
  if (isDev) {
    await win.loadURL('http://localhost:5173')
  } else {
    // Use local HTTP server so YouTube iframes work (they reject file:// and custom protocols)
    await win.loadURL(`http://127.0.0.1:${localServerPort}`)
  }
}

// ========================
// IPC HANDLERS
// ========================
const setupIpcHandlers = () => {
  // ----------------------
  // Encryption & Security
  // ----------------------
  ipcMain.handle('encrypt-data', (event, data) => {
    const key = encryptionService.getOrCreateEncryptionKey()
    return encryptionService.encryptData(data)
  })
  ipcMain.handle('decrypt-data', (event, data) => {
    const key = encryptionService.getOrCreateEncryptionKey()
    return encryptionService.decryptData(data)
  })
  ipcMain.handle('get-or-create-encryption-key', () => {
    return encryptionService.getOrCreateEncryptionKey()
  })
  ipcMain.handle('set-encryption-key', (event, key) => {
    encryptionService.setEncryptionKey(key)
    return true
  })
  ipcMain.handle('generateHash', async () => {
    try {
      const hash = await hashGenerator.generateHash()
      return hash
    } catch (error) {
      console.error('Error generating hash:', error)
      throw error
    }
  })
  ipcMain.handle('generate-hash', async (event, data) => {
    try {
      const hash = await hashGenerator.generateHash(data)
      return hash
    } catch (error) {
      console.error('Error generating hash:', error)
      throw error
    }
  })

  // ----------------------
  // OpenAI & AI Services
  // ----------------------
  ipcMain.handle('call-openai', async (event, { messages, model }) => {
    try {
      console.log('OpenAI API call started')
      console.log('Decrypting API key...')

      const apiKey = await encryptionService.decryptData(messages.apiKey)
      console.log('API key decrypted successfully')

      const openai = new OpenAI({
        apiKey: apiKey,
      })

      console.log('Making OpenAI API request...')
      const response = await openai.chat.completions.create({
        model: model || 'gpt-4',
        messages: messages.content,
      })
      console.log('OpenAI API request successful')

      return response.choices[0].message.content
    } catch (error) {
      console.error('OpenAI API error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      })
      throw error
    }
  })

  //audio-processing-progress
  ipcMain.on('audio-processing-progress', (event, progress) => {
    //need to seen this prgress to the App.vue
    event.sender.send('audio-processing-progress', progress)
  })

  ipcMain.handle(
    'call-openai-with-audio',
    async (event, { apiKey: encryptedApiKey, audio }) => {
      try {
        // Validate audio data
        if (!Buffer.isBuffer(audio) || audio.length === 0) {
          throw new Error('Invalid audio data received')
        }

        // Additional validation
        if (audio.length < 1024) {
          // Minimum 1KB of audio data
          throw new Error('Audio data too small')
        }

        const startTime = Date.now()
        console.log('📝 Processing audio transcription request...')
        console.log('Audio data size:', audio.length)

        // Decrypt the API key
        const apiKey = await encryptionService.decryptData(encryptedApiKey)
        console.log('✅ API key decrypted successfully')

        // Initialize transcription service with decrypted key
        const transcriptionService = new TranscriptionService({
          openaiKey: apiKey,
          whisperModel: 'whisper-1',
          prompt: `
        You are a professional transcription assistant. 
        Always format your responses in markdown format.
        Use the following guidelines:
        - Use headings for main topics
        - Use bullet points for lists
        - Use bold for emphasis
        - Use italics for pauses or soft emphasis
        - Use code blocks for technical terms
        - Use blockquotes for important statements
        - Use proper markdown syntax for all formatting
      `,
        })

        console.log('🎤 Sending audio for transcription...')

        const transcription = await transcriptionService.transcribe(audio)

        const duration = ((Date.now() - startTime) / 1000).toFixed(2)
        console.log('✨ Transcribed Text:', transcription)
        console.log(`✅ Transcription completed in ${duration}s`)

        return transcription
      } catch (error) {
        console.error('❌ Transcription error:', error)
        throw new Error(`Failed to transcribe audio: ${error.message}`)
      }
    }
  )
  ipcMain.handle(
    'generate-graph-with-openai',
    async (event, { apiKey: encryptedApiKey, transcript }) => {
      try {
        const apiKey = await encryptionService.decryptData(encryptedApiKey)

        // Create a progress handler that sends updates to renderer
        const progressHandler = (progress) => {
          if (!event.sender.isDestroyed()) {
            event.sender.send('openai-progress', progress)
          }
        }

        const jsonData = await openaiHelper.generateJsonFromTranscript(
          apiKey,
          transcript,
          progressHandler
        )

        // Update with new graph (no need to clear first since we're overwriting)
        if (!event.sender.isDestroyed()) {
          event.sender.send('db-operation', {
            type: 'updateSubjectGraph',
            data: { subjectId: jsonData.subjectId, graph: jsonData.graph },
          })
        }

        return jsonData
      } catch (error) {
        console.error('Error in IPC handler generate-json-with-openai:', error)
        throw error
      }
    }
  )
  ipcMain.handle(
    'generate-markdown-with-openai',
    async (
      event,
      { encryptedApiKey, transcript, subjectId, isFirstChunk, isLastChunk }
    ) => {
      try {
        const apiKey = await encryptionService.decryptData(encryptedApiKey)
        const openai = new OpenAI({ apiKey })

        const systemMessage = {
          role: 'system',
          content: `You are a research assistant that transforms transcripts into comprehensive research documents. Follow these guidelines:
        1. Structure content using markdown
        2. Use headings (##, ###) for main topics and subtopics
        3. Use bullet points for lists
        4. Use **bold** for key terms
        5. Use *italics* for emphasis
        6. Use \`code blocks\` for technical terms
        7. Use > blockquotes for important statements
        8. Add relevant external links where appropriate
        9. Include code snippets when technical concepts are discussed
        10. ${isFirstChunk ? 'Create a summary section at the top' : ''}
        11. ${isLastChunk ? 'Add a references section at the bottom' : ''}
        12. Use proper markdown syntax throughout`,
        }

        const userMessage = {
          role: 'user',
          content: transcript,
        }

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [systemMessage, userMessage],
          temperature: 0.5,
          max_tokens: 1500,
        })

        return {
          transcript: {
            text: response.choices[0].message.content,
          },
        }
      } catch (error) {
        console.error('Error generating markdown:', error)
        throw error
      }
    }
  )

  // ----------------------
  // Transcription Services
  // ----------------------
  ipcMain.handle(
    'transcribe-audio',
    async (event, { audioBuffer, encryptedApiKey }) => {
      try {
        console.log('📥 Received audio buffer:', {
          length: audioBuffer.length,
        })

        // Decrypt the API key
        const apiKey = await encryptionService.decryptData(encryptedApiKey)

        // Initialize transcription service with the decrypted key
        const transcriptionService = new TranscriptionService({
          openaiKey: apiKey,
          whisperModel: 'whisper-1',
          prompt: `
        You are a professional transcription assistant. You extract the most important information from the transcript that is actionable.
        Always format your responses in markdown format.
        Use the following guidelines:
        - Use headings for main topics
        - Use bullet points for lists
        - Use bold for emphasis
        - Use italics for pauses or soft emphasis
        - Use code blocks for technical terms
        - Use blockquotes for important statements
        - Use proper markdown syntax for all formatting
        - Use the transcript to create a summary of the most important information.
      `,
        })

        console.log('Starting transcription...')
        console.log('🔑 API Key present:', apiKey ? 'Yes' : 'No')
        console.log('🔑 API Key length:', apiKey?.length || 0)

        const transcript = await transcriptionService.transcribe(audioBuffer)

        return transcript
      } catch (error) {
        console.error('❌ Transcription error:', error)
        console.error('Error stack:', error.stack)
        console.error('Error response:', error.response?.data)
        console.error('Error status:', error.status)
        throw new Error(
          `Failed to transcribe audio: ${error.status} ${error.message}`
        )
      }
    }
  )
  ipcMain.handle('fetch-youtube-transcript', async (event, videoId) => {
    console.log('🎬 Fetching YouTube transcript for video ID:', videoId)

    try {
      // Validate video ID
      if (!videoId || typeof videoId !== 'string') {
        throw new Error('Invalid video ID provided')
      }

      // Validate video ID format (YouTube video IDs are 11 characters)
      if (videoId.length !== 11) {
        throw new Error('Invalid YouTube video ID format')
      }

      console.log('📋 Attempting to fetch transcript from YouTube...')

      // Method 1: Try yt-dlp (most reliable)
      try {
        console.log('🔄 Trying yt-dlp method...')
        const result = await fetchTranscriptYT(videoId)
        console.log(
          `✅ yt-dlp success: ${result.text.length} characters, ${result.segments.length} segments`
        )
        return result
      } catch (ytdlpError) {
        console.log('⚠️ yt-dlp failed:', ytdlpError.message)
      }

      // Method 2: Try Timedtext API as fallback
      try {
        console.log('🔄 Trying Timedtext fallback...')
        const result = await fetchTranscriptTimedtext(videoId)
        console.log(`✅ Timedtext success: ${result.text.length} characters`)
        return result
      } catch (timedtextError) {
        console.log('⚠️ Timedtext failed:', timedtextError.message)
      }

      // All methods failed
      throw new Error(
        'No transcript available for this video. The video may not have captions/subtitles enabled.'
      )
    } catch (error) {
      console.error('❌ Error fetching YouTube transcript:', {
        videoId,
        error: error.message,
        stack: error.stack,
      })

      // Provide more specific error messages
      let userMessage = 'Failed to fetch YouTube transcript'
      if (
        error.message.includes('No transcript') ||
        error.message.includes('No English captions') ||
        error.message.includes('No caption')
      ) {
        userMessage = 'No transcript available for this video'
      } else if (
        error.message.includes('Video unavailable') ||
        error.message.includes('private')
      ) {
        userMessage = 'Video is not available or private'
      } else if (error.message.includes('Invalid')) {
        userMessage = 'Invalid video URL or ID'
      } else if (
        error.message.includes('network') ||
        error.message.includes('ENOTFOUND') ||
        error.message.includes('ETIMEDOUT')
      ) {
        userMessage = 'Network error - please check your internet connection'
      }

      throw new Error(userMessage)
    }
  })

  // Helper function for Puppeteer scraping
  async function scrapeTranscriptWithPuppeteer(videoId) {
    let browser = null
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })
      const page = await browser.newPage()

      // Navigate to video page
      await page.goto(`https://www.youtube.com/watch?v=${videoId}`, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      })

      // Wait for video to load
      await page.waitForSelector('#movie_player', { timeout: 10000 })

      // Try to find and click transcript button
      const transcriptButtons = [
        '[aria-label*="transcript" i]',
        '[aria-label*="captions" i]',
        'button[aria-label*="Show transcript"]',
        '.ytp-menuitem[aria-label*="transcript" i]',
      ]

      let transcriptFound = false
      for (const selector of transcriptButtons) {
        try {
          await page.click(selector)
          transcriptFound = true
          break
        } catch (e) {
          // Continue to next selector
        }
      }

      if (!transcriptFound) {
        throw new Error('Could not find transcript button')
      }

      // Wait for transcript panel to load
      await page.waitForSelector(
        '.ytd-transcript-segment-renderer, .transcript-item, [data-testid="transcript-segment"]',
        { timeout: 5000 }
      )

      // Extract transcript text
      const transcriptSelectors = [
        '.ytd-transcript-segment-renderer',
        '.transcript-item',
        '[data-testid="transcript-segment"]',
      ]

      let transcriptText = ''
      for (const selector of transcriptSelectors) {
        try {
          const elements = await page.$$(selector)
          if (elements.length > 0) {
            const texts = await Promise.all(
              elements.map((el) =>
                page.evaluate((element) => element.textContent, el)
              )
            )
            transcriptText = texts.join(' ').trim()
            break
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      if (!transcriptText) {
        throw new Error('Could not extract transcript text')
      }

      return transcriptText
    } finally {
      if (browser) {
        await browser.close()
      }
    }
  }

  // ----------------------
  // Subject & Transcript Management
  // ----------------------
  ipcMain.handle(
    'save-transcript',
    async (event, { subjectId, transcript }) => {
      try {
        console.log('Main process: Saving transcript for subject:', subjectId)
        console.log('Transcript content:', transcript)

        // Use the renderer's db context
        event.sender.send('db-operation', {
          type: 'updateSubjectTranscript',
          data: { subjectId, transcript },
        })

        return true
      } catch (error) {
        console.error('Error saving transcript in main process:', error)
        throw error
      }
    }
  )
  ipcMain.handle('rename-subject', async (event, subjectId, newName) => {
    try {
      console.log(`Renaming subject ${subjectId} to ${newName}`)
      // Use the renderer's db context
      event.sender.send('db-operation', {
        type: 'renameSubject',
        data: { subjectId, newName },
      })
      return true
    } catch (error) {
      console.error('Error renaming subject:', error)
      throw error
    }
  })

  // ----------------------
  // Note Management
  // ----------------------
  ipcMain.handle('create-note', async (event, noteData) => {
    try {
      event.sender.send('db-operation', {
        type: 'createNote',
        data: noteData,
      })
      return true
    } catch (error) {
      console.error('Error creating note:', error)
      throw error
    }
  })
  ipcMain.handle('get-notes-by-subject', async (event, subjectId) => {
    try {
      event.sender.send('db-operation', {
        type: 'getNotesBySubject',
        data: { subjectId },
      })
      return true
    } catch (error) {
      console.error('Error fetching notes:', error)
      throw error
    }
  })
  ipcMain.handle('update-note-content', async (event, { noteId, content }) => {
    try {
      event.sender.send('db-operation', {
        type: 'updateNoteContent',
        data: { noteId, content },
      })
      return true
    } catch (error) {
      console.error('Error updating note:', error)
      throw error
    }
  })
  ipcMain.handle('delete-note', async (event, noteId) => {
    try {
      event.sender.send('db-operation', {
        type: 'deleteNote',
        data: { noteId },
      })
      return true
    } catch (error) {
      console.error('Error deleting note:', error)
      throw error
    }
  })

  // ----------------------
  // External Operations
  // ----------------------
  ipcMain.handle('open-external', (event, url) => {
    try {
      shell.openExternal(url)
      return true
    } catch (error) {
      console.error('Error opening external link:', error)
      return false
    }
  })

  ipcMain.handle('open-pdf', async (event, filePath) => {
    try {
      const { shell } = require('electron')
      await shell.openPath(filePath)
      return true
    } catch (error) {
      console.error('Error opening PDF:', error)
      throw error
    }
  })

  // Add this with your other IPC handlers
  ipcMain.handle('download-pdf', async (event, { htmlContent, fileName }) => {
    try {
      const tempFilePath = path.join(app.getPath('temp'), `${fileName}.pdf`)

      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })

      const page = await browser.newPage()
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
      })

      await page.pdf({
        path: tempFilePath,
        format: 'A4',
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
        printBackground: true,
      })

      await browser.close()

      return tempFilePath
    } catch (error) {
      console.error('PDF generation error:', error)
      throw error
    }
  })

  ipcMain.handle(
    'process-pdf-transcript',
    async (event, { encryptedApiKey, transcript, subjectId }) => {
      try {
        // Decrypt the API key
        const apiKey = await encryptionService.decryptData(encryptedApiKey)

        // Create progress handler
        const progressHandler = (progress) => {
          event.sender.send('pdf-processing-progress', progress)
        }

        // First generate markdown
        const markdown = await openaiHelper.generateMarkdownFromTranscript(
          apiKey,
          transcript,
          progressHandler
        )

        // Then generate graph from markdown
        const graph = await openaiHelper.generateJsonFromTranscript(
          apiKey,
          markdown,
          progressHandler
        )

        // Update subject with new graph and markdown
        event.sender.send('db-operation', {
          type: 'updateSubjectGraph',
          data: { subjectId, graph },
        })

        return {
          markdown,
          graph,
        }
      } catch (error) {
        console.error('Error processing PDF transcript:', error)
        throw error
      }
    }
  )

  ipcMain.handle('export-subject-data', async (event, { subjectId }) => {
    try {
      // Get the export data
      const exportData = await exportSubjectData(subjectId)

      // Show save dialog
      const { filePath } = await dialog.showSaveDialog({
        title: 'Export Subject Data',
        defaultPath: path.join(
          app.getPath('documents'),
          `${exportData.metadata.subject.name.replace(
            /[^a-z0-9]/gi,
            '_'
          )}_export.json`
        ),
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      })

      if (!filePath) {
        return { cancelled: true }
      }

      // Write the file
      await fs.writeFile(filePath, JSON.stringify(exportData, null, 2))

      return { success: true, filePath }
    } catch (error) {
      console.error('Error exporting subject data:', error)
      throw error
    }
  })

  ipcMain.handle('export-subject', async (event, data) => {
    const { filePath } = await dialog.showSaveDialog({
      defaultPath: `subject-${data.subject.name}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })

    if (filePath) {
      try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2))
        return { success: true }
      } catch (error) {
        return { success: false, error: error.message }
      }
    }
    return { success: false }
  })

  ipcMain.handle('import-subject', async () => {
    const { filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })

    if (filePaths && filePaths[0]) {
      try {
        const data = await fs.readFile(filePaths[0], 'utf-8')
        return { success: true, data: JSON.parse(data) }
      } catch (error) {
        return { success: false, error: error.message }
      }
    }
    return { success: false }
  })

  ipcMain.on('verify-file-exists', async (event, filePath) => {
    try {
      const stats = await fs.stat(filePath)
      event.sender.send('file-verified', {
        exists: true,
        size: stats.size,
      })
    } catch (err) {
      event.sender.send('file-verified', {
        exists: false,
      })
    }
  })

  // Add these handlers in the setupIpcHandlers function, near the other export/import handlers
  ipcMain.handle('export-workspace-to-file', async (event, workspaceData) => {
    try {
      const { filePath } = await dialog.showSaveDialog({
        title: 'Export Workspace',
        defaultPath: `workspace-${Date.now()}.workspace.json`,
        filters: [
          { name: 'Workspace Files', extensions: ['workspace.json'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      })

      if (!filePath) return { success: false }

      await fs.writeFile(filePath, JSON.stringify(workspaceData, null, 2))
      return { success: true }
    } catch (error) {
      console.error('Error exporting workspace:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('import-workspace-from-file', async () => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'JSON', extensions: ['json'] }],
      })

      if (canceled || !filePaths[0]) {
        return { success: false, error: 'No file selected' }
      }

      const fileContent = await fs.readFile(filePaths[0], 'utf8')
      const jsonData = JSON.parse(fileContent)

      // Send the data to the renderer for processing
      return { success: true, data: jsonData }
    } catch (error) {
      console.error('Error importing workspace:', error)
      return { success: false, error: error.message }
    }
  })
}

// ========================
// MEETING RECORDING
// ========================
let recordingStream = null

const setupMeetingHandlers = () => {
  // Handle opening meeting URLs in default browser
  ipcMain.on('join-meeting', (event, meetingUrl) => {
    shell.openExternal(meetingUrl)
  })

  // Start audio recording
  ipcMain.on('start-ffmpeg-recording', async (event, { outputFilename }) => {
    console.log('Starting recording process...')
    try {
      const outputPath = path.join(app.getPath('downloads'), outputFilename)
      console.log('Output path:', outputPath)

      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 0, height: 0 },
      })

      const primaryDisplay = screen.getPrimaryDisplay()
      const mainSource = sources.find(
        (source) => source.display_id === primaryDisplay.id.toString()
      )

      if (!mainSource) {
        throw new Error('No screen source found')
      }

      console.log('Selected source:', mainSource.id)

      const captureWin = new BrowserWindow({
        width: 1,
        height: 1,
        show: false,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
          webSecurity: false,
        },
      })

      // Updated capture script with better error handling and monitoring
      await captureWin.loadURL(`data:text/html,<script>
        (async () => {
          let stream = null;
          let recorder = null;
          
          try {
            console.log('Requesting system audio...');
            stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                mandatory: {
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: '${mainSource.id}'
                },
                optional: [
                  {echoCancellation: false},
                  {noiseSuppression: false},
                  {autoGainControl: false}
                ]
              },
              video: false
            });

            console.log('Audio stream obtained:', stream.getAudioTracks().length, 'tracks');
            
            const chunks = [];
            recorder = new MediaRecorder(stream, {
              mimeType: 'audio/webm',
              audioBitsPerSecond: 128000
            });

            console.log('MediaRecorder created with state:', recorder.state);

            recorder.ondataavailable = e => {
              console.log('Data available event:', e.data?.size || 0, 'bytes');
              if (e.data?.size > 0) {
                chunks.push(e.data);
              }
            };

            recorder.onerror = error => {
              console.error('MediaRecorder error:', error);
              require('electron').ipcRenderer.send('recording-error', error.toString());
            };

            recorder.onstop = async () => {
              console.log('MediaRecorder stopped. Processing', chunks.length, 'chunks');
              try {
                if (chunks.length === 0) {
                  throw new Error('No audio data was recorded');
                }

                const blob = new Blob(chunks, { type: 'audio/webm' });
                console.log('Blob created:', blob.size, 'bytes');
                
                const buffer = await blob.arrayBuffer();
                console.log('ArrayBuffer created:', buffer.byteLength, 'bytes');
                
                require('electron').ipcRenderer.send('save-recording', buffer);
              } catch (error) {
                console.error('Failed to process recording:', error);
                require('electron').ipcRenderer.send('recording-error', error.toString());
              } finally {
                if (stream) {
                  stream.getTracks().forEach(track => track.stop());
                }
              }
            };

            recorder.start(1000); // Capture in 1-second chunks
            console.log('MediaRecorder started');
            require('electron').ipcRenderer.send('recorder-started');

            require('electron').ipcRenderer.once('stop-recording', () => {
              console.log('Stop recording requested');
              if (recorder && recorder.state === 'recording') {
                recorder.stop();
              }
            });

          } catch (error) {
            console.error('Recording setup failed:', error);
            require('electron').ipcRenderer.send('recording-error', error.toString());
          }
        })();
      </script>`)

      // Handle saving the recording
      ipcMain.once('save-recording', async (event, arrayBuffer) => {
        console.log('Received recording data:', arrayBuffer.byteLength, 'bytes')
        try {
          const buffer = Buffer.from(arrayBuffer)
          await fs.promises.writeFile(outputPath, buffer)

          const stats = await fs.promises.stat(outputPath)
          console.log('Recording saved:', stats.size, 'bytes')

          if (stats.size === 0) {
            throw new Error('Saved file is empty')
          }

          event.sender.send('ffmpeg-stopped', { outputPath })
          shell.showItemInFolder(outputPath)
        } catch (error) {
          console.error('Failed to save recording:', error)
          event.sender.send('ffmpeg-stopped', { error: error.toString() })
        } finally {
          if (!captureWin.isDestroyed()) {
            captureWin.destroy()
          }
        }
      })

      // Handle recording errors
      ipcMain.once('recording-error', (event, error) => {
        console.error('Recording error:', error)
        event.sender.send('ffmpeg-stopped', { error })
        if (!captureWin.isDestroyed()) {
          captureWin.destroy()
        }
      })
    } catch (error) {
      console.error('Setup failed:', error)
      event.sender.send('ffmpeg-stopped', { error: error.toString() })
    }
  })

  // Stop recording
  ipcMain.on('stop-ffmpeg-recording', () => {
    console.log('Stopping recording...')
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('stop-recording')
    })
  })

  // Show file in folder
  ipcMain.on('show-in-folder', (event, filePath) => {
    shell.showItemInFolder(filePath)
  })
}

// ========================
// APPLICATION LIFECYCLE
// ========================
app.whenReady().then(() => {
  setupServices()
  setupIpcHandlers()
  setupMeetingHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Cleanup local server on quit
app.on('will-quit', () => {
  if (localServer) {
    localServer.close()
    console.log('[Local Server] Server closed')
  }
})

ipcMain.on('close-app', () => {
  app.quit()
})
