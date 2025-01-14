import { db } from '../db/db'
import { exportSubjectData, importSubjectData } from './subjectExporter'

export async function exportWorkspaceData(workspaceId) {
  try {
    // Get the workspace
    const workspace = await db.workspaces.get(workspaceId)
    if (!workspace) {
      throw new Error('Workspace not found')
    }

    // Get all subjects for this workspace
    const subjects = await db.subjects
      .where('workspaceId')
      .equals(workspaceId)
      .toArray()

    // Export each subject's data
    const subjectsData = await Promise.all(
      subjects.map(subject => exportSubjectData(workspaceId, subject.id))
    )

    // Compile workspace export data
    const exportData = {
      workspace: {
        ...workspace,
        id: undefined, // Remove ID as it will be different when imported
      },
      subjects: subjectsData,
      metadata: {
        exportDate: new Date().toISOString(),
        version: '1.0',
      },
    }

    return exportData
  } catch (error) {
    console.error('Error exporting workspace data:', error)
    throw error
  }
}

export async function importWorkspaceData(jsonData) {
  try {
    const { workspace, subjects } = jsonData
    const userId = parseInt(localStorage.getItem('userUUID'))

    // Validate the data
    if (!workspace || !workspace.name || !Array.isArray(subjects)) {
      throw new Error('Invalid workspace data format')
    }
    
    if (!userId) {
      throw new Error('No user ID found')
    }

    // Create new workspace
    const newWorkspace = {
      ...workspace,
      createdAt: new Date(),
    }

    // Start a transaction to ensure all data is imported atomically
    const workspaceId = await db.transaction(
      'rw',
      [db.workspaces, db.workspaceUsers, db.subjects, db.notes, db.pdfs],
      async () => {
        // Add the workspace first
        const newWorkspaceId = await db.workspaces.add(newWorkspace)

        // Create workspace-user relationship
        await db.workspaceUsers.add({
          userId: userId,
          workspaceId: newWorkspaceId,
          role: 'owner',
          joinedAt: new Date()
        })

        // Import each subject
        await Promise.all(
          subjects.map(subjectData => 
            importSubjectData(newWorkspaceId, subjectData)
          )
        )

        return newWorkspaceId
      }
    )

    return workspaceId
  } catch (error) {
    console.error('Error importing workspace data:', error)
    throw error
  }
}
