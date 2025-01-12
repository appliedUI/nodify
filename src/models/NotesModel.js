export class NotesModel {
  constructor({
    id,
    content,
    workspaceId,
    createdAt = new Date(),
    updatedAt = new Date(),
    status = 'active',
    tags = [],
    metadata = {},
  }) {
    this.id = id
    this.content = content || ''
    this.workspaceId = workspaceId
    this.createdAt = createdAt
    this.updatedAt = updatedAt
    this.status = status
    this.tags = tags
    this.metadata = metadata
  }

  static get schema() {
    return '++id, content, workspaceId, createdAt, updatedAt, status, tags, metadata'
  }

  static validate(noteData) {
    const errors = []

    if (!noteData.content?.trim()) {
      errors.push('Note content is required')
    }

    if (!noteData.workspaceId) {
      errors.push('Workspace ID is required')
    }

    return errors
  }
}
