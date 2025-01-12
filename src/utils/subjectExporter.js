import { db } from '../db/db'

export async function exportSubjectData(workspaceId, subjectId) {
  try {
    // Get the main subject data
    const subject = await db.subjects.get(subjectId)
    if (!subject || subject.workspaceId !== workspaceId) {
      throw new Error(
        'Subject not found or does not belong to the specified workspace'
      )
    }

    // Get all related data
    const [notes, pdfs] = await Promise.all([
      db.notes.where('workspaceId').equals(workspaceId).toArray(),
      db.pdfs.where('subjectId').equals(subjectId).toArray(),
    ])

    // Clean up the graph state to ensure all numeric values are properly handled
    let cleanGraphState = null
    if (subject.graphState) {
      cleanGraphState = {
        transform: {
          x: Number(subject.graphState.transform?.x) || 0,
          y: Number(subject.graphState.transform?.y) || 0,
          k: Number(subject.graphState.transform?.k) || 1,
        },
        nodePositions: {},
        controls: {
          linkDistance:
            Number(subject.graphState.controls?.linkDistance) || 200,
          chargeStrength:
            Number(subject.graphState.controls?.chargeStrength) || -300,
          edgeCurvature:
            Number(subject.graphState.controls?.edgeCurvature) || 0,
          collideRadius:
            Number(subject.graphState.controls?.collideRadius) || 60,
          edgeLength: Number(subject.graphState.controls?.edgeLength) || 200,
          nodeSeparation:
            Number(subject.graphState.controls?.nodeSeparation) || 2,
        },
        openPanels: subject.graphState.openPanels || [],
      }

      // Clean up node positions
      if (subject.graphState.nodePositions) {
        Object.entries(subject.graphState.nodePositions).forEach(
          ([key, pos]) => {
            if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
              cleanGraphState.nodePositions[key] = {
                x: Number(pos.x),
                y: Number(pos.y),
                fx: pos.fx !== undefined ? Number(pos.fx) : undefined,
                fy: pos.fy !== undefined ? Number(pos.fy) : undefined,
              }
            }
          }
        )
      }
    }

    // Get the graph data and clean it up
    let cleanGraph = null
    if (subject.graph) {
      // First create clean nodes with all properties
      const nodes =
        subject.graph.nodes?.map((node) => ({
          id: node.id,
          label: node.label || node.name,
          level: node.level || 1,
          description: node.description,
          relationships: node.relationships || { connections: [] },
          generalKnowledge: node.generalKnowledge,
          importance: node.importance || 5,
          children: node.children || [],
          index: node.index,
          x: node.x,
          y: node.y,
          vx: node.vx,
          vy: node.vy,
        })) || []

      // Create a map of nodes by ID for reference
      const nodeMap = new Map(nodes.map((node) => [node.id, node]))

      // Create links with full node objects
      const links =
        subject.graph.links
          ?.map((link) => {
            const sourceNode = nodeMap.get(
              typeof link.source === 'object' ? link.source.id : link.source
            )
            const targetNode = nodeMap.get(
              typeof link.target === 'object' ? link.target.id : link.target
            )

            if (!sourceNode || !targetNode) {
              console.warn('Invalid link:', link)
              return null
            }

            return {
              source: sourceNode,
              target: targetNode,
              relationship: link.relationship,
              index: link.index,
            }
          })
          .filter((link) => link !== null) || []

      cleanGraph = { nodes, links }
    }

    // Get the graph state from localStorage as well
    const localStorageGraph = JSON.parse(localStorage.getItem('graph'))
    const mergedGraph = cleanGraph
      ? {
          nodes: cleanGraph.nodes.map((node) => {
            const localNode = localStorageGraph?.nodes?.find(
              (n) => n.id === node.id
            )
            return localNode ? { ...node, ...localNode } : node
          }),
          links: cleanGraph.links.map((link) => {
            const localLink = localStorageGraph?.links?.find(
              (l) =>
                (l.source.id === link.source.id &&
                  l.target.id === link.target.id) ||
                (l.source === link.source.id && l.target === link.target.id)
            )
            return localLink ? { ...link, ...localLink } : link
          }),
        }
      : cleanGraph

    // Get both the database graphState and localStorage graphState
    const localStorageGraphState = JSON.parse(localStorage.getItem('graphState'))
    const mergedGraphState = {
      ...cleanGraphState,
      ...localStorageGraphState,
      nodePositions: {
        ...(cleanGraphState?.nodePositions || {}),
        ...(localStorageGraphState?.nodePositions || {})
      },
      controls: {
        ...(cleanGraphState?.controls || {}),
        ...(localStorageGraphState?.controls || {})
      }
    }

    // Compile all data into a single export object
    const exportData = {
      subject: {
        ...subject,
        id: undefined, // Remove the ID as it will be different when imported
        graphState: mergedGraphState,
        graph: mergedGraph,
      },
      notes: notes.map((note) => ({
        ...note,
        id: undefined,
      })),
      pdfs: pdfs.map((pdf) => ({
        ...pdf,
        id: undefined,
      })),
      metadata: {
        exportDate: new Date().toISOString(),
        version: '1.0',
      },
    }

    return exportData
  } catch (error) {
    console.error('Error exporting subject data:', error)
    throw error
  }
}

export async function importSubjectData(workspaceId, jsonData) {
  try {
    const { subject, notes, pdfs } = jsonData

    // Validate the data
    if (!subject || !subject.name) {
      throw new Error('Invalid subject data format')
    }

    // Save graphState to localStorage if it exists
    if (subject.graphState) {
      localStorage.setItem('graphState', JSON.stringify(subject.graphState))
    }

    // Clean up the graph
    const cleanGraph = cleanGraphForImport(subject.graph)

    // Create a new subject with the imported data
    const newSubject = {
      ...subject,
      workspaceId,
      createdAt: new Date(),
      graphState: subject.graphState,
      graph: cleanGraph,
    }

    // Start a transaction to ensure all data is imported atomically
    const subjectId = await db.transaction(
      'rw',
      [db.subjects, db.notes, db.pdfs],
      async () => {
        // Add the subject first
        const newSubjectId = await db.subjects.add(newSubject)

        // Import notes if they exist
        if (notes && Array.isArray(notes)) {
          await Promise.all(
            notes.map((note) =>
              db.notes.add({
                ...note,
                workspaceId,
                createdAt: new Date(),
              })
            )
          )
        }

        // Import PDFs if they exist
        if (pdfs && Array.isArray(pdfs)) {
          await Promise.all(
            pdfs.map((pdf) =>
              db.pdfs.add({
                ...pdf,
                subjectId: newSubjectId,
                createdAt: new Date(),
              })
            )
          )
        }

        return newSubjectId
      }
    )

    return subjectId
  } catch (error) {
    console.error('Error importing subject data:', error)
    throw error
  }
}

function cleanGraphForExport(graph) {
  if (!graph) return null
  
  // Clean up nodes
  const nodes = graph.nodes?.map(node => ({
    id: node.id,
    label: node.label || node.name,
    level: node.level || 1,
    description: node.description,
    relationships: node.relationships || { connections: [] },
    generalKnowledge: node.generalKnowledge,
    importance: node.importance || 5,
    children: node.children || [],
    // Don't include D3-specific properties like x, y, vx, vy
  })) || []

  // Clean up links - store only IDs for source and target
  const links = graph.links?.map(link => ({
    source: typeof link.source === 'object' ? link.source.id : link.source,
    target: typeof link.target === 'object' ? link.target.id : link.target,
    relationship: link.relationship
  })) || []

  return { nodes, links }
}

function cleanGraphForImport(graph) {
  if (!graph) return null

  // Create clean nodes
  const nodes = graph.nodes?.map(node => ({
    id: node.id,
    label: node.label || node.name,
    level: node.level || 1,
    description: node.description,
    relationships: node.relationships || { connections: [] },
    generalKnowledge: node.generalKnowledge,
    importance: node.importance || 5,
    children: node.children || []
  })) || []

  // Create a map of nodes by ID
  const nodeMap = new Map(nodes.map(node => [node.id, node]))

  // Create links with node references as required by D3
  const links = graph.links?.map(link => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source
    const targetId = typeof link.target === 'object' ? link.target.id : link.target
    
    return {
      source: nodeMap.get(sourceId),
      target: nodeMap.get(targetId),
      relationship: link.relationship
    }
  }).filter(link => link.source && link.target) || []

  return { nodes, links }
}
