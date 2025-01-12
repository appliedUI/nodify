export class PDFModel {
  static schema = '++id, subjectId, content, markdownContent, createdAt'

  constructor(data) {
    this.id = data.id
    this.subjectId = data.subjectId
    this.content = data.content
    this.markdownContent = data.markdownContent
    this.createdAt = data.createdAt || new Date()
  }
}
