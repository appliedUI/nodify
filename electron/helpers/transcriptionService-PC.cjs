const OpenAI = require('openai')
const fs = require('fs')
const path = require('path')
const ffmpeg = require('fluent-ffmpeg')
const { app } = require('electron')

class TranscriptionService {
  constructor({ openaiKey, whisperModel, testMode = true }) {
    // Configure FFmpeg paths based on platform
    if (app.isPackaged) {
      // For production builds
      const resourcesPath = path.join(process.resourcesPath)
      ffmpeg.setFfmpegPath(path.join(resourcesPath, 'ffmpeg', 'ffmpeg.exe'))
      ffmpeg.setFfprobePath(path.join(resourcesPath, 'ffprobe', 'ffprobe.exe'))
    } else {
      // For development
      const devResourcesPath = path.join(__dirname, '../../resources')
      ffmpeg.setFfmpegPath(path.join(devResourcesPath, 'ffmpeg.exe'))
      ffmpeg.setFfprobePath(path.join(devResourcesPath, 'ffprobe.exe'))
    }

    this.openai = new OpenAI({
      apiKey: openaiKey,
    })
    this.model = whisperModel
    this.MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB (slightly larger than chunk size)
    this.CHUNK_SIZE = 20 * 1024 * 1024 // 20MB chunks
    this.testMode = true // Force test mode

    // Use app.isPackaged instead of NODE_ENV
    this.uploadsDir = app.isPackaged
      ? path.join(app.getPath('temp'), 'my-app-uploads') // Use system temp directory in production
      : path.join(__dirname, '../uploads') // Use local uploads directory in development

    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true })
      console.log('Created uploads directory:', this.uploadsDir)
    }
  }

  async transcribe(audioBuffer, progressCallback = null) {
    const tempFilePath = path.join(
      this.uploadsDir,
      `recording-${Date.now()}.webm`
    )
    const wavFilePath = path.join(
      this.uploadsDir,
      `recording-${Date.now()}.wav`
    )

    console.log(`🎬 Starting transcription process`)
    console.log(`📥 Writing audio buffer to temporary file: ${tempFilePath}`)

    try {
      // Write the buffer to a temporary file
      fs.writeFileSync(tempFilePath, audioBuffer)
      console.log(`✅ Temporary file created: ${tempFilePath}`)

      // Convert to WAV format with proper settings
      console.log(`🔄 Converting ${tempFilePath} to WAV format...`)
      await new Promise((resolve, reject) => {
        ffmpeg(tempFilePath)
          .audioChannels(1) // Ensure mono audio
          .audioFrequency(16000) // Set sample rate to 16kHz
          .output(wavFilePath)
          .on('end', () => {
            console.log(`✅ Conversion complete: ${wavFilePath}`)
            resolve()
          })
          .on('error', (err) => {
            console.error('❌ FFmpeg conversion error:', err)
            reject(err)
          })
          .run()
      })

      // Verify the converted file
      console.log(`🔍 Inspecting audio file metadata...`)
      const metadata = await this.inspectAudioFile(wavFilePath)
      if (!metadata.streams || metadata.streams.length === 0) {
        throw new Error('❌ Failed to convert audio to valid format')
      }
      console.log(`✅ Audio file verified`)

      // Check file size and chunk if necessary
      const fileSize = fs.statSync(wavFilePath).size
      console.log(`📏 File size: ${(fileSize / 1024).toFixed(2)}KB`)

      if (fileSize <= this.MAX_FILE_SIZE) {
        console.log(`📄 Processing as single file`)
        return await this.processSingleFile(wavFilePath)
      } else {
        console.log(`✂️ File exceeds size limit, processing in chunks`)
        return await this.processChunkedFile(wavFilePath, progressCallback)
      }
    } finally {
      // Clean up temporary files
      console.log(`🧹 Cleaning up temporary files...`)
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath)
        console.log(`🗑️ Deleted temporary file: ${tempFilePath}`)
      }
      if (fs.existsSync(wavFilePath)) {
        fs.unlinkSync(wavFilePath)
        console.log(`🗑️ Deleted WAV file: ${wavFilePath}`)
      }
      console.log(`✅ Cleanup complete`)
    }
  }

  async processSingleFile(filePath) {
    console.log(`📤 Sending 1 file to OpenAI API`)
    const file = fs.createReadStream(filePath)
    const transcription = await this.openai.audio.transcriptions.create({
      file: file,
      model: this.model,
      response_format: 'json',
      language: 'en',
    })
    console.log(`✅ Received transcription for 1 file`)
    return transcription.text
  }

  async processChunkedFile(filePath, progressCallback) {
    const fileSize = fs.statSync(filePath).size
    const totalChunks = Math.ceil(fileSize / this.CHUNK_SIZE)
    let fullTranscript = ''
    let lastNumber = 0

    console.log(`📂 Starting chunked processing`)
    console.log(`📊 File size: ${(fileSize / 1024).toFixed(2)}KB`)
    //emit this to the main process
    ipcMain.emit('audio-processing-progress', {
      status: 'processing',
      currentChunk: 0,
      totalChunks: totalChunks,
      message: 'Starting chunked processing',
    })
    console.log(`🔢 Total chunks to process: ${totalChunks}`)
    console.log(`📦 Chunk size: ${(this.CHUNK_SIZE / 1024).toFixed(2)}KB`)

    for (let i = 0; i < totalChunks; i++) {
      const start = i * this.CHUNK_SIZE
      const end = Math.min(start + this.CHUNK_SIZE, fileSize)

      console.log(`\n🔪 Processing chunk ${i + 1}/${totalChunks}`)
      console.log(`📏 Chunk byte range: ${start}-${end}`)
      console.log(`📦 Chunk size: ${((end - start) / 1024).toFixed(2)}KB`)

      const chunk = await this.readFileChunk(
        filePath,
        start,
        end,
        i,
        totalChunks
      )
      if (!chunk) continue

      console.log(`📤 Sending chunk ${i + 1}/${totalChunks} to OpenAI API`)
      try {
        const transcription = await this.openai.audio.transcriptions.create({
          file: chunk,
          model: this.model,
          response_format: 'json',
          language: 'en',
        })

        // Process the transcription text
        let text = transcription.text
        const numbers = text.match(/\b\d+\b/g) || []
        const lastChunkNumber =
          numbers.length > 0 ? parseInt(numbers[numbers.length - 1]) : 0

        // If we detect a number sequence, ensure continuity
        if (
          lastChunkNumber > 0 &&
          lastNumber > 0 &&
          lastChunkNumber <= lastNumber
        ) {
          // Remove duplicate numbers
          text = text.replace(
            new RegExp(
              `\\b(${Array.from({ length: lastNumber }, (_, i) => i + 1).join(
                '|'
              )})\\b`,
              'g'
            ),
            ''
          )
        }

        // Update last number
        if (lastChunkNumber > lastNumber) {
          lastNumber = lastChunkNumber
        }

        console.log(
          `✅ Received transcription for chunk ${i + 1}/${totalChunks}`
        )
        console.log(`📝 Transcription text: ${text}`)
        console.log(`📏 Transcription length: ${text.length} characters`)

        fullTranscript += text + ' '
      } catch (error) {
        console.error(
          `❌ Error transcribing chunk ${i + 1}/${totalChunks}:`,
          error
        )
        throw error
      } finally {
        if (fs.existsSync(chunk.path)) {
          fs.unlinkSync(chunk.path)
          console.log(`🗑️ Cleaned up chunk file: ${chunk.path}`)
        }
      }

      if (progressCallback) {
        progressCallback({
          current: i + 1,
          total: totalChunks,
          isComplete: false,
        })
      }
    }

    if (progressCallback) {
      progressCallback({
        current: totalChunks,
        total: totalChunks,
        isComplete: true,
      })
    }

    // Clean up the final transcript
    fullTranscript = fullTranscript
      .replace(/\s+/g, ' ') // Remove extra spaces
      .trim()

    console.log(`\n🎉 Completed processing all chunks`)
    console.log(
      `📝 Final transcript length: ${fullTranscript.length} characters`
    )
    return fullTranscript
  }

  async readFileChunk(filePath, start, end, chunkIndex, totalChunks) {
    // Calculate chunk size for 5 seconds of audio at 16kHz
    const chunkSize = 16000 * 2 * 5 // 16000 samples/sec * 2 bytes/sample * 5 seconds
    const overlap = 16000 * 2 * 1 // 1 second overlap

    // Adjust start and end for first and last chunks
    const adjustedStart = Math.max(0, start - (chunkIndex > 0 ? overlap : 0))
    const adjustedEnd = Math.min(
      end + (chunkIndex < totalChunks - 1 ? overlap : 0),
      fs.statSync(filePath).size
    )

    // Skip very short chunks (less than 1 second)
    if (adjustedEnd - adjustedStart < 16000 * 2) {
      console.log(
        `⏭️ Skipping very short chunk ${chunkIndex + 1}/${totalChunks}`
      )
      return null
    }

    const chunkPath = path.join(
      this.uploadsDir,
      `chunk-${Date.now()}-${adjustedStart}-${adjustedEnd}.wav`
    )

    // Create chunk with proper timing and overlap
    await new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .setStartTime(adjustedStart / 32000) // 32000 = 16000 samples/sec * 2 bytes/sample
        .setDuration((adjustedEnd - adjustedStart) / 32000)
        .audioChannels(1)
        .audioFrequency(16000)
        .output(chunkPath)
        .on('end', resolve)
        .on('error', reject)
        .run()
    })

    return fs.createReadStream(chunkPath)
  }

  async handleLargeFile(filePath, progressCallback = null) {
    try {
      if (progressCallback) {
        progressCallback({
          status: 'processing',
          progress: 0,
          message: 'Splitting large audio file into chunks...',
        })
      }

      const chunks = await this.splitAudioFile(filePath)
      const transcriptions = []
      let processedChunks = 0

      for (const chunk of chunks) {
        const file = fs.createReadStream(chunk)
        const response = await this.openai.audio.transcriptions.create({
          file,
          model: this.model,
          language: 'en',
        })
        transcriptions.push(response.text)

        processedChunks++
        if (progressCallback) {
          const progress = Math.round((processedChunks / chunks.length) * 100)
          progressCallback({
            status: 'processing',
            progress,
            message: `Processing chunk ${processedChunks} of ${chunks.length}...`,
          })
        }

        // Clean up chunk after processing
        this.cleanupFile(chunk)
      }

      if (progressCallback) {
        progressCallback({
          status: 'complete',
          progress: 100,
          message: 'Transcription complete',
        })
      }

      // Join transcriptions with proper spacing and punctuation
      return this.stitchTranscriptions(transcriptions)
    } catch (error) {
      console.error(
        '[TranscriptionService] Error processing large file:',
        error
      )
      if (progressCallback) {
        progressCallback({
          status: 'error',
          message: error.message,
        })
      }
      throw error
    }
  }

  async splitAudioFile(inputPath) {
    const chunkPaths = []
    const duration = await this.getAudioDuration(inputPath)
    const chunkDuration = 60 // Split into 1-minute chunks
    const numChunks = Math.ceil(duration / chunkDuration)

    for (let i = 0; i < numChunks; i++) {
      const outputPath = path.join(
        this.uploadsDir,
        `chunk-${Date.now()}-${i}.webm`
      )

      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .setStartTime(i * chunkDuration)
          .setDuration(chunkDuration)
          .output(outputPath)
          .on('end', () => {
            chunkPaths.push(outputPath)
            resolve()
          })
          .on('error', reject)
          .run()
      })
    }

    return chunkPaths
  }

  getAudioDuration(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) reject(err)
        else resolve(metadata.format.duration)
      })
    })
  }

  cleanupFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        console.log(`Cleaned up file: ${path.basename(filePath)}`)
      }
    } catch (error) {
      console.error(`Error cleaning up file ${filePath}:`, error)
    }
  }

  async inspectAudioFile(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          console.error('Audio file inspection failed:', err)
          reject(err)
        } else {
          console.log('Audio file metadata:', {
            format: metadata.format,
            streams: metadata.streams,
          })
          resolve(metadata)
        }
      })
    })
  }

  stitchTranscriptions(transcriptions) {
    return transcriptions
      .map((text) => text.trim())
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
  }
}

module.exports = {
  TranscriptionService,
}
