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
      const workspacesData = Array.from(workspaces.value.entries()).map(([id, workspace]) => [
        id,
        {
          id: workspace.id,
          name: workspace.name,
          createdAt: workspace.createdAt,
          updatedAt: workspace.updatedAt,
          chatHistory: workspace.chatHistory,
          canvasItems: workspace.canvasItems
        }
      ])
      
      localStorage.setItem('fact-check-workspaces', JSON.stringify(workspacesData))
    } catch (error) {
      console.error('Error saving workspaces to localStorage:', error)
    }
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
    updateCanvasItem
  }
}