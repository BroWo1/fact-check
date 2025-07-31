import { ref, onMounted, onUnmounted } from 'vue'

export function useTextSelection() {
  const selectedText = ref('')
  const selectionPosition = ref({ x: 0, y: 0 })
  const showSelectionButton = ref(false)
  const selectionRange = ref(null)

  let selectionTimeout = null

  const handleSelectionChange = () => {
    // Clear any existing timeout
    if (selectionTimeout) {
      clearTimeout(selectionTimeout)
    }

    // Small delay to avoid flickering
    selectionTimeout = setTimeout(() => {
      const selection = window.getSelection()
      const text = selection.toString().trim()

      console.log('Selection changed:', text) // Debug log

      if (text.length > 0 && selection.rangeCount > 0) {
        selectedText.value = text
        selectionRange.value = selection.getRangeAt(0)
        
        // Get selection position relative to document (not viewport)
        const rect = selection.getRangeAt(0).getBoundingClientRect()
        selectionPosition.value = {
          x: rect.left + rect.width / 2 + window.scrollX, // Add horizontal scroll offset
          y: rect.top - 40 + window.scrollY // Position above selection + vertical scroll offset
        }
        
        showSelectionButton.value = true
        console.log('Popup should show at:', selectionPosition.value) // Debug log
      } else {
        clearSelection()
      }
    }, 200) // Increased delay
  }

  const clearSelection = () => {
    selectedText.value = ''
    selectionRange.value = null
    showSelectionButton.value = false
    selectionPosition.value = { x: 0, y: 0 }
    
    if (selectionTimeout) {
      clearTimeout(selectionTimeout)
      selectionTimeout = null
    }
  }

  const handleClickOutside = (event) => {
    // Don't clear if clicking on the popup button or its parent
    if (event.target.closest('.text-selection-popup')) {
      return
    }
    
    // Only clear selection if there's no text selection
    // This prevents clearing when user is still selecting text
    setTimeout(() => {
      const selection = window.getSelection()
      if (!selection.toString().trim()) {
        clearSelection()
      }
    }, 50)
  }

  onMounted(() => {
    document.addEventListener('selectionchange', handleSelectionChange)
    document.addEventListener('click', handleClickOutside)
    
    // Additional mobile-specific events
    document.addEventListener('touchend', handleSelectionChange)
    document.addEventListener('touchstart', () => {
      // Small delay to let selection complete
      setTimeout(handleSelectionChange, 300)
    })
  })

  onUnmounted(() => {
    document.removeEventListener('selectionchange', handleSelectionChange)
    document.removeEventListener('click', handleClickOutside)
    document.removeEventListener('touchend', handleSelectionChange)
    document.removeEventListener('touchstart', handleSelectionChange)
    
    if (selectionTimeout) {
      clearTimeout(selectionTimeout)
    }
  })

  return {
    selectedText,
    selectionPosition,
    showSelectionButton,
    selectionRange,
    clearSelection
  }
}