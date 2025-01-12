// convertToHierarchy.js
export function buildHierarchy(mindmapData) {
  if (!mindmapData?.nodes?.length) {
    return { id: 'empty', label: 'No Data', children: [] }
  }

  // 1) Make a map from nodeId => node object
  const nodeMap = new Map()
  mindmapData.nodes.forEach((node) => {
    // Create a copy of the node plus an empty children array
    nodeMap.set(node.id, { ...node, children: [] })
  })

  // 2) Identify the root node (level = 0)
  const rootNode = mindmapData.nodes.find((n) => n.level === 0)
  if (!rootNode) {
    return { id: 'empty', label: 'No Root Node', children: [] }
  }

  // 3) Build child relationships using the 'children' arrays
  mindmapData.nodes.forEach((node) => {
    const mappedNode = nodeMap.get(node.id)
    mappedNode.children = node.children
      .map((childId) => nodeMap.get(childId))
      .filter(Boolean) // Remove any undefined if childId not found

    // Debug: Verify child assignments
    if (mappedNode.children.length === 0 && node.children.length > 0) {
      console.warn(`Node "${node.id}" has children IDs that were not found.`)
    }
  })

  // 4) Return the "expanded" root from the map
  const rootObj = nodeMap.get(rootNode.id)

  // Debug: Avoid circular references by not using JSON.stringify

  return rootObj
}
