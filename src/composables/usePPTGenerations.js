import { ref, computed } from 'vue'

const STORAGE_KEY = 'ppt-generations'

// Reactive state for PPT generations
const pptGenerations = ref([])

// Load from localStorage
const loadGenerations = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      pptGenerations.value = JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load PPT generations:', e)
    pptGenerations.value = []
  }
}

// Persist to localStorage
const persistGenerations = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pptGenerations.value))
  } catch (e) {
    console.error('Failed to save PPT generations:', e)
  }
}

// Initialize
loadGenerations()

export function usePPTGenerations() {
  const recordPPTGeneration = (sessionId, slideCount = 0) => {
    const generation = {
      id: sessionId,
      timestamp: new Date().toISOString(),
      slideCount
    }
    
    // Check if already recorded to avoid duplicates
    const exists = pptGenerations.value.find(g => g.id === sessionId)
    if (!exists) {
      pptGenerations.value.unshift(generation)
      persistGenerations()
    }
  }

  const getWeeklyPPTGenerations = computed(() => {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    
    return pptGenerations.value.filter(generation => {
      try {
        const generationDate = new Date(generation.timestamp)
        return !isNaN(generationDate.getTime()) && generationDate >= oneWeekAgo
      } catch {
        return false
      }
    }).length
  })

  return {
    pptGenerations,
    recordPPTGeneration,
    getWeeklyPPTGenerations
  }
}