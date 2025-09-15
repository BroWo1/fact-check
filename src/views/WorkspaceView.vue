<template>
  <div class="workspace-view">
    <!-- Original Header -->
    <div class="header" :class="{ 'mobile-expanded': isMobileMenuOpen }">
      <div class="header-content">
        <div class="header-row-primary">
          <div class="logo-section" @click="handleLogoClick">
            <img
              src="../assets/itlookslegitTrans.png"
              alt="Logo"
              class="logo-image"
              style="height: 56px; width: auto; margin-right: 8px;"
            />
          </div>
          <div class="header-actions">
            <div class="header-menu-items-wrapper-desktop">
              <SavedAnalysesDropdown @select-analysis="handleSelectSavedAnalysis" />
              <Button
                class="settings-button"
                @click="showSettingsModal = true"
                size="small"
              >
                <Settings class="settings-icon" :size="14" />
                <span class="settings-label">{{ $t('settings.title') }}</span>
              </Button>
            </div>
            <Button
              class="mobile-menu-button"
              @click="toggleMobileMenu"
              :class="{ 'is-active': isMobileMenuOpen }"
            >
              ☰
            </Button>
          </div>
        </div>
        <div class="header-row-secondary" :class="{ 'collapsed': !isMobileMenuOpen }">
          <div class="secondary-content">
            <SavedAnalysesDropdown @select-analysis="handleSelectSavedAnalysis" />
            <Button
              class="settings-button"
              @click="showSettingsModal = true"
              size="small"
            >
              <Settings class="settings-icon" :size="14" />
              <span class="settings-label">{{ $t('settings.title') }}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="workspace-layout" ref="workspaceLayout">
      <!-- Left AI Chat Panel -->
      <div 
        class="chat-panel"
        :style="{ width: chatPanelWidth + 'px' }"
        ref="chatPanel"
      >
        <AIChatPanel 
          :workspace="currentWorkspace"
          @send-message="handleChatMessage"
        />
      </div>

      <!-- Draggable Resize Handle -->
      <div 
        class="resize-divider" 
        @mousedown="startResize"
        ref="resizeHandle"
      >
        <div class="resize-grip"></div>
      </div>

      <!-- Right Canvas Collection -->
      <div class="canvas-collection" ref="canvasCollection">
        <CanvasCollection 
          :workspace="currentWorkspace"
          @add-canvas="handleAddCanvas"
          @remove-canvas="handleRemoveCanvas"
          @update-canvas="handleUpdateCanvas"
          @enlarge-item="handleEnlargeItem"
          @update-workspace-name="handleUpdateWorkspaceName"
        />
        
        <!-- Preview Overlay -->
        <CanvasItemPreview 
          v-if="selectedItem"
          :item="selectedItem"
          @update="handleUpdateCanvas"
          @close="selectedItem = null"
          class="preview-overlay"
        />
      </div>
    </div>
    
    <!-- Settings Modal -->
    <SettingsModal
      :visible="showSettingsModal"
      @close="showSettingsModal = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button, notification } from 'ant-design-vue'
import { Settings } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import AIChatPanel from '../components/workspace/AIChatPanel.vue'
import CanvasCollection from '../components/workspace/CanvasCollection.vue'
import CanvasItemPreview from '../components/workspace/CanvasItemPreview.vue'
import SavedAnalysesDropdown from '../components/SavedAnalysesDropdown.vue'
import SettingsModal from '../components/SettingsModal.vue'
import { useWorkspace } from '../composables/useWorkspace'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

// UI state
const showSettingsModal = ref(false)
const isMobileMenuOpen = ref(false)

const {
  currentWorkspace,
  loadWorkspace,
  saveWorkspace,
  addCanvasItem,
  removeCanvasItem,
  updateCanvasItem,
  addChatMessage,
  getStorageUsage,
  cleanupOldWorkspaces
} = useWorkspace()

// Reactive state for panel sizing
const selectedItem = ref(null)
const chatPanelWidth = ref(400) // Default width
const isResizing = ref(false)

// Component refs
const workspaceLayout = ref(null)
const chatPanel = ref(null)
const canvasCollection = ref(null)
const resizeHandle = ref(null)

const handleChatMessage = (message) => {
  addChatMessage(message)
  saveWorkspace()
  // Check storage after adding chat messages (but only occasionally to avoid spam)
  if (Math.random() < 0.1) { // 10% chance to check
    checkStorageQuota()
  }
}

const handleEnlargeItem = (item) => {
  selectedItem.value = item
}

const handleAddCanvas = (canvasData) => {
  addCanvasItem(canvasData)
  saveWorkspace()
  checkStorageQuota()
}

const handleRemoveCanvas = (canvasId) => {
  removeCanvasItem(canvasId)
  saveWorkspace()
}

const handleUpdateCanvas = (canvasId, updates) => {
  updateCanvasItem(canvasId, updates)
  saveWorkspace()
}

const handleUpdateWorkspaceName = (newName) => {
  if (currentWorkspace.value) {
    currentWorkspace.value.name = newName
    currentWorkspace.value.updatedAt = new Date().toISOString()
    saveWorkspace()
    checkStorageQuota()
  }
}

// Monitor storage usage and show warnings
const checkStorageQuota = () => {
  const usage = getStorageUsage()
  if (usage) {
    if (parseFloat(usage.quotaUsagePercent) > 80) {
      notification.warning({
        message: 'Storage Almost Full',
        description: `Workspace storage is ${usage.quotaUsagePercent}% full. Consider cleaning up old workspaces.`,
        duration: 6,
        btn: h(Button, {
          type: 'primary',
          size: 'small',
          onClick: () => {
            const result = cleanupOldWorkspaces(5)
            if (result) {
              notification.success({
                message: 'Storage Cleaned',
                description: `Removed ${result.removed} old workspaces. Kept ${result.kept} recent ones.`,
                duration: 4
              })
            }
          }
        }, 'Clean Up')
      })
    }
  }
}

// Header handlers
const handleLogoClick = () => {
  router.push('/')
}

const handleSelectSavedAnalysis = (analysis) => {
  if (!analysis) return
  
  // Calculate the highest z-index for new items
  const canvasItems = currentWorkspace.value?.canvasItems || []
  const maxZIndex = Math.max(...canvasItems.map(item => item.zIndex || 1), 1)
  
  // Determine analysis type and create appropriate canvas item
  const analysisType = analysis.mode === 'research' ? 'research' : 'factcheck'
  
  // Create canvas item data from the analysis
  const itemData = {
    type: analysisType,
    title: analysis.originalClaim || analysis.claim || `${analysisType} Analysis`,
    analysisId: analysis.id,
    claim: analysis.originalClaim || analysis.claim,
    verdict: analysis.results?.verdict || analysis.verdict,
    confidence: analysis.results?.confidence_score ? Math.round(analysis.results.confidence_score * 100) : analysis.confidence,
    analysis: analysis.results?.reasoning || analysis.results?.analysis || analysis.results?.summary || analysis.analysis || analysis.summary,
    evidence: analysis.results?.evidence || analysis.evidence,
    sources: analysis.results?.sources || analysis.sources,
    limitations: analysis.results?.limitations || analysis.limitations || [],
    recommendations: analysis.results?.recommendations || analysis.recommendations || [],
    results: (() => {
      // Handle different result structures
      let sourceResults = []
      
      // First try to get results from analysis.results.sources (for research mode)
      if (analysis.results?.sources && Array.isArray(analysis.results.sources)) {
        sourceResults = analysis.results.sources
      }
      // Then try analysis.sources (for older format)
      else if (analysis.sources && Array.isArray(analysis.sources)) {
        sourceResults = analysis.sources
      }
      // Finally try analysis.results.evidence (for fact-check mode)
      else if (analysis.results?.evidence && Array.isArray(analysis.results.evidence)) {
        sourceResults = analysis.results.evidence
      }
      
      return sourceResults.map((source, idx) => {
        // Handle both object and string sources
        const sourceObj = typeof source === 'string' ? { title: source, url: source } : source
        try {
          return {
            id: `result_${idx}`,
            title: sourceObj.title || sourceObj.source || sourceObj.name || sourceObj.text || `Source ${idx + 1}`,
            snippet: sourceObj.description || sourceObj.summary || sourceObj.excerpt || sourceObj.text || 'No description available',
            url: sourceObj.url || sourceObj.link || sourceObj.href || '',
            domain: sourceObj.url ? new URL(sourceObj.url).hostname : '',
            relevance: sourceObj.relevance || Math.floor(Math.random() * 20) + 80
          }
        } catch (error) {
          console.warn('Error processing source:', source, error)
          return {
            id: `result_${idx}`,
            title: `Source ${idx + 1}`,
            snippet: 'Unable to process source data',
            url: '',
            domain: '',
            relevance: 80
          }
        }
      })
    })(),
    timestamp: analysis.timestamp,
    status: 'completed',
    zIndex: maxZIndex + 1,
    position: { x: 50 + (canvasItems.length * 20), y: 50 + (canvasItems.length * 20) },
    size: { width: 400, height: 500 }
  }

  // Add the analysis as a canvas item
  addCanvasItem(itemData)
  saveWorkspace()
  
  // Show success notification
  notification.success({
    message: 'Analysis Added to Workspace',
    description: `Added "${analysis.originalClaim || analysis.claim}" to canvas`,
    duration: 3
  })
}

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

// Resize functionality
const startResize = (e) => {
  e.preventDefault()
  e.stopPropagation()
  
  isResizing.value = true
  
  const startX = e.clientX
  const startWidth = chatPanelWidth.value
  const layoutRect = workspaceLayout.value?.getBoundingClientRect()
  
  if (!layoutRect) return
  
  const minWidth = 250
  const maxWidth = Math.min(600, layoutRect.width * 0.6)
  
  // Add visual feedback
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  
  let animationId = null
  
  const handleMouseMove = (moveEvent) => {
    if (!isResizing.value) return
    
    // Cancel previous animation frame
    if (animationId) {
      cancelAnimationFrame(animationId)
    }
    
    // Use requestAnimationFrame for smooth resizing
    animationId = requestAnimationFrame(() => {
      const deltaX = moveEvent.clientX - startX
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + deltaX))
      
      chatPanelWidth.value = newWidth
    })
  }
  
  const handleMouseUp = () => {
    isResizing.value = false
    
    if (animationId) {
      cancelAnimationFrame(animationId)
    }
    
    // Reset cursor and selection
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    
    // Remove event listeners
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    
    // Save the new width to localStorage for persistence
    localStorage.setItem('workspace-chat-panel-width', chatPanelWidth.value.toString())
  }
  
  // Add event listeners
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

// Load saved panel width on mount
onMounted(() => {
  const workspaceId = route.params.id
  if (workspaceId) {
    loadWorkspace(workspaceId)
  }
  
  // Restore saved panel width
  const savedWidth = localStorage.getItem('workspace-chat-panel-width')
  if (savedWidth) {
    const width = parseInt(savedWidth, 10)
    if (width >= 250 && width <= 600) {
      chatPanelWidth.value = width
    }
  }
})
</script>

<style scoped>
.workspace-view {
  height: 100vh;
  background: #fafafa;
  display: flex;
  flex-direction: column;
}

/* Header styles */
.header {
  background: #ffffff;
  border-bottom: 1px solid #e0e0e0;
  padding: 0;
  height: 80px;
  position: sticky;
  top: 0;
  z-index: 100;
  transition: height 0.25s ease-out;
}

.header.mobile-expanded {
  height: 140px;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  height: 100%;
  display: grid;
  grid-template-rows: 80px 1fr;
  align-items: center;
}

.header-row-primary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 80px;
}

.logo-section {
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 8px;
  border-radius: 8px;
  margin-left: -8px;
}

.logo-section:hover {
  background: rgba(0, 0, 0, 0.05);
}

.logo-section:active {
  background: rgba(0, 0, 0, 0.1);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
}

.header-menu-items-wrapper-desktop {
  display: flex;
  align-items: center;
  gap: 16px;
}

.settings-button {
  height: 32px !important;
  border-radius: 6px !important;
  background: #f8f9fa !important;
  border: 1px solid #d9d9d9 !important;
  color: #666666 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: all 0.2s ease !important;
  padding: 0 12px !important;
  min-width: auto !important;
  gap: 6px !important;
}

.settings-button:hover {
  background: #e6f7ff !important;
  border-color: #91caff !important;
  color: #1890ff !important;
}

.settings-icon {
  flex-shrink: 0;
}

.settings-label {
  font-size: 12px;
  font-weight: 500;
}

.header-row-secondary {
  display: none; /* Hidden on desktop by default */
}

.header-row-secondary .secondary-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 12px 0;
  min-height: 0;
  opacity: 1;
  filter: blur(0);
  transition: padding 0.2s ease, opacity 0.2s ease, filter 0.2s ease;
  position: relative;
  z-index: 1001;
}

.mobile-menu-button {
  display: none;
  background: transparent !important;
  border: none !important;
  color: #000 !important;
  font-size: 24px !important;
  padding: 0 8px !important;
  line-height: 1 !important;
  transition: transform 0.3s ease-in-out;
}

.mobile-menu-button.is-active {
  transform: rotate(90deg);
}

/* Allow dropdowns in mobile header to extend beyond header boundaries */
.header.mobile-expanded .header-row-secondary {
  overflow: visible;
}

.header.mobile-expanded .header-row-secondary .secondary-content {
  overflow: visible;
}


.workspace-layout {
  display: flex;
  height: calc(100vh - 80px);
  flex: 1;
}

.chat-panel {
  min-width: 250px;
  max-width: 600px;
  border-right: 1px solid #e9ecef;
  background: #ffffff;
  flex-shrink: 0;
}

.resize-divider {
  width: 6px;
  background: transparent;
  cursor: col-resize;
  position: relative;
  flex-shrink: 0;
  user-select: none;
  transition: background-color 0.2s ease;
}

.resize-divider:hover {
  background: #e6f4ff;
}

.resize-grip {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 2px;
  height: 40px;
  background: #d9d9d9;
  border-radius: 1px;
  transition: all 0.2s ease;
}

.resize-divider:hover .resize-grip {
  background: #1890ff;
  width: 3px;
  height: 60px;
}

.canvas-collection {
  flex: 1;
  background: #f8f9fa;
  position: relative;
  min-width: 0; /* Allow flex shrinking */
}

.preview-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  background: #ffffff;
}

@media (max-width: 768px) {
  .header {
    height: 70px;
  }
  
  .header.mobile-expanded {
    height: 130px;
  }
  
  .header-content {
    padding: 0 16px;
    grid-template-rows: 70px auto;
  }
  
  .header-row-primary {
    height: 70px;
  }
  
  .header-row-secondary {
    border-top-color: #f0f0f0;
    display: grid;
  }
  
  .header-row-secondary.collapsed {
    grid-template-rows: 0fr;
    border-top-color: transparent;
  }
  
  .header-row-secondary .secondary-content {
    padding: 8px 0 12px 0;
  }
  
  .header-row-secondary.collapsed {
    opacity: 0;
    transform: translateY(-10px);
    max-height: 0;
    padding-top: 0;
    padding-bottom: 0;
    margin-top: 0;
    margin-bottom: 0;
    overflow: hidden;
    pointer-events: none;
  }
  
  .header-row-secondary.collapsed .secondary-content {
    padding-top: 0;
    padding-bottom: 0;
    opacity: 0;
    filter: blur(4px);
  }
  
  .logo-section {
    margin-left: -4px;
    padding: 4px;
    min-width: 0;
    flex: 1;
  }
  
  .header-actions {
    gap: 0;
    flex-shrink: 0;
  }
  
  .header-menu-items-wrapper-desktop {
    display: none;
  }
  
  .mobile-menu-button {
    display: block;
  }
  
  /* Ensure dropdown components in mobile header have proper z-index and positioning */
  .header.mobile-expanded .saved-analyses-dropdown {
    position: static;
  }

  .header.mobile-expanded .saved-analyses-dropdown .dropdown-menu {
    position: fixed;
    top: auto;
    right: 16px;
    left: 16px;
    z-index: 1100;
    transform: translateY(8px);
    min-width: auto;
    max-width: none;
    width: auto;
    margin: 0;
  }

  /* Ensure the header doesn't clip dropdowns when expanded */
  .header.mobile-expanded {
    overflow: visible;
  }

  .header.mobile-expanded .header-content {
    overflow: visible;
  }

  .header.mobile-expanded .header-row-secondary {
    overflow: visible;
    z-index: 1050;
  }

  .header.mobile-expanded .header-row-secondary .secondary-content {
    overflow: visible;
    z-index: 1050;
  }

  .workspace-layout {
    flex-direction: column;
    height: calc(100vh - 70px);
  }
  
  .chat-panel {
    width: 100% !important;
    max-width: none;
    height: 250px;
    border-right: none;
    border-bottom: 1px solid #e9ecef;
  }

  .resize-divider {
    display: none; /* Hide resize divider on mobile */
  }
  
  .canvas-collection {
    height: calc(100vh - 250px - 70px);
  }
}
</style>