import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

export async function pdfToMarkdown(file, progressCallback) {
  console.log('[PDF Processor] Starting PDF processing...')
  try {
    console.log('[PDF Processor] Converting file to ArrayBuffer')
    const arrayBuffer = await file.arrayBuffer()

    console.log('[PDF Processor] Creating PDF loading task')
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useWorkerFetch: false,
      disableStream: true,
      disableAutoFetch: true,
    })

    if (progressCallback) {
      progressCallback({
        percent: 10,
        message: 'Loading PDF document',
      })
    }

    console.log('[PDF Processor] Loading PDF document')
    const pdf = await loadingTask.promise
    console.log(`[PDF Processor] Loaded document with ${pdf.numPages} pages`)

    let markdownContent = ''
    let textContent = ''
    const numPages = pdf.numPages

    for (let i = 1; i <= numPages; i++) {
      console.log(`[PDF Processor] Processing page ${i}/${numPages}`)
      const page = await pdf.getPage(i)
      const text = await page.getTextContent()
      const pageText = text.items.map((item) => item.str).join(' ')

      console.log(`[PDF Processor] Page ${i} text length:`, pageText.length)
      textContent += pageText + '\n\n'
      markdownContent += convertTextToMarkdown(pageText) + '\n\n'

      if (progressCallback) {
        const percent = Math.round(((i / numPages) * 80) + 10) // Scale from 10-90%
        progressCallback({
          percent,
          message: numPages === 1 
            ? 'Processing PDF content'
            : `Processing page ${i} of ${numPages}`,
        })
      }
    }

    if (progressCallback) {
      progressCallback({
        percent: 100,
        message: 'Finalizing PDF processing',
      })
    }

    console.log('[PDF Processor] Completed processing')
    console.log('[PDF Processor] Final markdown length:', markdownContent.length)
    console.log('[PDF Processor] Final text length:', textContent.length)

    return {
      markdown: markdownContent.trim(),
      text: textContent.trim(),
    }
  } catch (error) {
    console.error('[PDF Processor] Error processing PDF:', error)
    throw error
  }
}

function convertTextToMarkdown(text) {
  // Basic markdown conversion rules
  return text
    .replace(/\n{3,}/g, '\n\n') // Normalize line breaks
    .replace(/^(#+)\s*(.*)/gm, '# $2') // Convert headings
    .replace(/\*\*(.*?)\*\*/g, '**$1**') // Bold
    .replace(/_(.*?)_/g, '_$1_') // Italics
    .replace(/(https?:\/\/[^\s]+)/g, '[$1]($1)') // Links
}
