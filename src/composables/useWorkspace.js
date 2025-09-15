import { ref, reactive, computed } from 'vue'

const workspaces = ref(new Map())
const currentWorkspaceId = ref(null)

export function useWorkspace() {
  const currentWorkspace = computed(() => {
    if (!currentWorkspaceId.value) return null
    return workspaces.value.get(currentWorkspaceId.value)
  })

  const createWorkspace = (name = 'New Workspace') => {
    const id = generateWorkspaceId()
    const workspace = reactive({
      id,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chatHistory: [],
      canvasItems: []
    })
    
    workspaces.value.set(id, workspace)
    currentWorkspaceId.value = id
    saveToLocalStorage()
    
    return workspace
  }

  const loadWorkspace = (id) => {
    loadFromLocalStorage()
    
    if (workspaces.value.has(id)) {
      currentWorkspaceId.value = id
      return workspaces.value.get(id)
    } else {
      return createWorkspace()
    }
  }

  const saveWorkspace = () => {
    if (currentWorkspace.value) {
      currentWorkspace.value.updatedAt = new Date().toISOString()
      saveToLocalStorage()
    }
  }

  const deleteWorkspace = (id) => {
    workspaces.value.delete(id)
    if (currentWorkspaceId.value === id) {
      currentWorkspaceId.value = null
    }
    saveToLocalStorage()
  }

  const getAllWorkspaces = () => {
    loadFromLocalStorage()
    return Array.from(workspaces.value.values()).sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    )
  }

  const addChatMessage = (message) => {
    if (!currentWorkspace.value) return
    
    const chatMessage = {
      id: generateMessageId(),
      ...message,
      timestamp: new Date().toISOString()
    }
    
    currentWorkspace.value.chatHistory.push(chatMessage)
  }

  const addCanvasItem = (canvasData) => {
    if (!currentWorkspace.value) return
    
    const canvasItem = {
      id: generateCanvasId(),
      ...canvasData,
      createdAt: new Date().toISOString(),
      position: { x: Math.random() * 200, y: Math.random() * 200 },
      size: { width: 400, height: 300 }
    }
    
    currentWorkspace.value.canvasItems.push(canvasItem)
    return canvasItem
  }

  const removeCanvasItem = (canvasId) => {
    if (!currentWorkspace.value) return
    
    const index = currentWorkspace.value.canvasItems.findIndex(
      item => item.id === canvasId
    )
    
    if (index !== -1) {
      currentWorkspace.value.canvasItems.splice(index, 1)
    }
  }

  const updateCanvasItem = (canvasId, updates) => {
    if (!currentWorkspace.value) return
    
    const item = currentWorkspace.value.canvasItems.find(
      item => item.id === canvasId
    )
    
    if (item) {
      Object.assign(item, updates)
    }
  }

  const generateWorkspaceId = () => {
    return 'workspace_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  const generateMessageId = () => {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  const generateCanvasId = () => {
    return 'canvas_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  const saveToLocalStorage = () => {
    try {
      // Limit to most recent 10 workspaces to prevent quota issues
      const sortedWorkspaces = Array.from(workspaces.value.entries())
        .sort(([,a], [,b]) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 10)
      
      const workspacesData = sortedWorkspaces.map(([id, workspace]) => {
        // Optimize workspace data to reduce size
        const optimizedWorkspace = {
          id: workspace.id,
          name: workspace.name,
          createdAt: workspace.createdAt,
          updatedAt: workspace.updatedAt,
          chatHistory: (workspace.chatHistory || []).slice(-50), // Keep only last 50 messages
          canvasItems: (workspace.canvasItems || []).map(item => optimizeCanvasItem(item))
        }
        return [id, optimizedWorkspace]
      })
      
      const dataString = JSON.stringify(workspacesData)
      
      // Check if data is too large (> 4MB, leaving buffer for other localStorage data)
      if (dataString.length > 4 * 1024 * 1024) {
        console.warn('Workspace data too large, removing oldest workspace')
        // Remove oldest workspace and try again
        if (workspacesData.length > 1) {
          workspacesData.pop()
          localStorage.setItem('fact-check-workspaces', JSON.stringify(workspacesData))
        }
        return
      }
      
      localStorage.setItem('fact-check-workspaces', dataString)
    } catch (error) {
      console.error('Error saving workspaces to localStorage:', error)
      
      if (error.name === 'QuotaExceededError') {
        // Try to free up space by removing old workspaces
        try {
          const sortedWorkspaces = Array.from(workspaces.value.entries())
            .sort(([,a], [,b]) => new Date(b.updatedAt) - new Date(a.updatedAt))
            .slice(0, 5) // Keep only 5 most recent
          
          const minimalData = sortedWorkspaces.map(([id, workspace]) => [
            id,
            {
              id: workspace.id,
              name: workspace.name,
              createdAt: workspace.createdAt,
              updatedAt: workspace.updatedAt,
              chatHistory: [], // Clear chat history to save space
              canvasItems: (workspace.canvasItems || []).slice(0, 10).map(item => ({
                id: item.id,
                type: item.type,
                title: item.title,
                position: item.position,
                size: item.size,
                zIndex: item.zIndex
              }))
            }
          ])
          
          localStorage.setItem('fact-check-workspaces', JSON.stringify(minimalData))
          console.warn('Reduced workspace data due to storage quota')
        } catch (fallbackError) {
          console.error('Failed to save even minimal workspace data:', fallbackError)
          // Clear workspace storage as last resort
          try {
            localStorage.removeItem('fact-check-workspaces')
            console.warn('Cleared workspace storage due to persistent quota issues')
          } catch (clearError) {
            console.error('Cannot clear workspace storage:', clearError)
          }
        }
      }
    }
  }
  
  const optimizeCanvasItem = (item) => {
    // Remove large data that can be regenerated or isn't essential
    const optimized = {
      id: item.id,
      type: item.type,
      title: item.title,
      position: item.position,
      size: item.size,
      zIndex: item.zIndex,
      createdAt: item.createdAt,
      status: item.status
    }
    
    // For analysis items, keep only essential data
    if (item.type === 'research' || item.type === 'factcheck') {
      optimized.analysisId = item.analysisId
      optimized.claim = item.claim
      optimized.verdict = item.verdict
      optimized.confidence = item.confidence
      // Truncate analysis text to save space
      optimized.analysis = item.analysis ? item.analysis.substring(0, 1000) : ''
      // Keep only first 5 sources/evidence
      optimized.sources = (item.sources || []).slice(0, 5)
      optimized.evidence = (item.evidence || []).slice(0, 5)
      optimized.results = (item.results || []).slice(0, 5)
    } else if (item.type === 'document') {
      // For documents, truncate content
      optimized.content = item.content ? item.content.substring(0, 5000) : ''
    } else if (item.type === 'webpage') {
      optimized.url = item.url
    }
    
    return optimized
  }

  const loadFromLocalStorage = () => {
    try {
      const saved = localStorage.getItem('fact-check-workspaces')
      if (saved) {
        const workspacesData = JSON.parse(saved)
        workspaces.value.clear()
        
        workspacesData.forEach(([id, workspaceData]) => {
          workspaces.value.set(id, reactive(workspaceData))
        })
      }
    } catch (error) {
      console.error('Error loading workspaces from localStorage:', error)
    }
  }

  const getStorageUsage = () => {
    try {
      let totalSize = 0
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length
        }
      }
      
      const workspaceSize = localStorage.getItem('fact-check-workspaces')?.length || 0
      
      return {
        totalSize,
        workspaceSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        workspaceSizeMB: (workspaceSize / (1024 * 1024)).toFixed(2),
        quotaUsagePercent: ((totalSize / (5 * 1024 * 1024)) * 100).toFixed(1) // Assuming 5MB quota
      }
    } catch (error) {
      console.error('Error calculating storage usage:', error)
      return null
    }
  }
  
  const cleanupOldWorkspaces = (keepCount = 5) => {
    try {
      const sorted = Array.from(workspaces.value.entries())
        .sort(([,a], [,b]) => new Date(b.updatedAt) - new Date(a.updatedAt))
      
      // Remove old workspaces from memory
      const toKeep = sorted.slice(0, keepCount)
      const toRemove = sorted.slice(keepCount)
      
      toRemove.forEach(([id]) => {
        workspaces.value.delete(id)
      })
      
      // Save the cleaned up data
      saveToLocalStorage()
      
      return {
        kept: toKeep.length,
        removed: toRemove.length
      }
    } catch (error) {
      console.error('Error cleaning up workspaces:', error)
      return null
    }
  }

  return {
    currentWorkspace,
    currentWorkspaceId,
    createWorkspace,
    loadWorkspace,
    saveWorkspace,
    deleteWorkspace,
    getAllWorkspaces,
    addChatMessage,
    addCanvasItem,
    removeCanvasItem,
    updateCanvasItem,
    getStorageUsage,
    cleanupOldWorkspaces
  }
}