
import { db } from '@/db/db'

export async function exportWorkspaceData(workspaceId) {
  try {
    // Gather all the workspace-related data
    const workspace = await db.workspaces.get(workspaceId)
    const subjects = await db.subjects.where('workspaceId').equals(workspaceId).toArray()
    const notes = await db.notes.where('workspaceId').equals(workspaceId).toArray()
    const workspaceUsers = await db.workspaceUsers.where('workspaceId').equals(workspaceId).toArray()
    const pdfs = await db.pdfs.where('workspaceId').equals(workspaceId).toArray()

    return {
      metadata: {
        workspace,
      },
      data: {
        subjects,
        notes,
        workspaceUsers,
        pdfs,
      },
    }
  } catch (error) {
    console.error('Error exporting workspace data:', error)
    throw error
  }
}