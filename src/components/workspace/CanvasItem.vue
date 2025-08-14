<template>
  <div 
    :class="['canvas-item', `type-${item.type}`, { 'grid-mode': isGridView, 'free-mode': !isGridView }]"
    :style="freeViewStyle"
    ref="canvasItemRef"
    @click="bringToFront"
  >
    <div 
      class="item-header drag-handle" 
      @mousedown="startDrag"
      :style="{ cursor: isGridView ? 'default' : 'move' }"
    >
      <div class="item-type-badge">
        <component :is="typeIcon" :size="14" />
        <span>{{ typeLabel }}</span>
      </div>
      
      <div class="item-actions">
        <Button 
          class="action-btn enlarge-btn"
          size="small"
          @click="$emit('enlarge', item)"
          :title="t('workspace.viewFullscreen')"
        >
          <Expand :size="12" />
        </Button>
        <!--
        <Button 
          class="action-btn"
          size="small"
          @click="toggleExpanded"
          v-if="!isGridView"
        >
          <Maximize2 v-if="!isExpanded" :size="12" />
          <Minimize2 v-else :size="12" />
        </Button>
        -->
        
        <Dropdown :trigger="['click']">
          <Button class="action-btn" size="small">
            <MoreHorizontal :size="12" />
          </Button>
          <template #overlay>
            <Menu @click="handleAction">
              <MenuItem key="edit">
                <Edit :size="14" />
                {{ t('workspace.edit') }}
              </MenuItem>
              <MenuItem key="duplicate">
                <Copy :size="14" />
                {{ t('workspace.duplicate') }}
              </MenuItem>
              <MenuItem key="export">
                <Download :size="14" />
                {{ t('workspace.export') }}
              </MenuItem>
              <MenuDivider />
              <MenuItem key="delete" class="danger-item">
                <Trash2 :size="14" />
                {{ t('workspace.delete') }}
              </MenuItem>
            </Menu>
          </template>
        </Dropdown>
      </div>
    </div>

    <div class="item-title" v-if="item.title">
      <h4>{{ item.title }}</h4>
    </div>

    <div class="item-content">
      <!-- Research Content - Full Content Display -->
      <div v-if="item.type === 'research'" class="research-content full-height">
        <div v-if="item.results || item.analysis" class="research-results scrollable">
          <!-- Full Research Report with integrated sources -->
          <div class="full-research-display">
            <div 
              class="markdown-summary full-content" 
              v-html="renderedMarkdownSummary"
            ></div>
            
            <!-- Limitations integrated in content -->
            <div v-if="item.limitations && item.limitations.length > 0" class="limitations-section">
              <h4>{{ t('research.limitations') }}</h4>
              <ul class="limitations-list">
                <li v-for="(limitation, index) in item.limitations" :key="index">
                  {{ limitation }}
                </li>
              </ul>
            </div>
            
            <!-- Recommendations integrated in content -->
            <div v-if="item.recommendations && item.recommendations.length > 0" class="recommendations-section">
              <h4>{{ t('research.recommendations') }}</h4>
              <ul class="recommendations-list">
                <li v-for="(recommendation, index) in item.recommendations" :key="index">
                  {{ recommendation }}
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div v-else class="placeholder-content">
          <Search :size="32" />
          <p>{{ t('workspace.researchPlaceholder') }}</p>
        </div>
      </div>

      <!-- Fact Check Content - Full Content Display -->
      <div v-if="item.type === 'factcheck'" class="factcheck-content full-height">
        <div v-if="item.verdict || item.analysis" class="factcheck-results full-height scrollable">
          <!-- Verdict and confidence display -->
          <div class="verdict-section">
            <div class="verdict-badge" :class="item.verdict" v-if="item.verdict">
              <span class="verdict-icon">{{ getVerdictIcon(item.verdict) }}</span>
              <span class="verdict-text">{{ item.verdict }}</span>
            </div>
            <div class="confidence-score" v-if="item.confidence">
              {{ item.confidence }}% {{ t('workspace.confidence') }}
            </div>
          </div>
          
          <!-- Full claim display -->
          <div class="claim-text" v-if="item.claim">
            <h4>{{ t('workspace.claimAnalyzed') }}</h4>
            <blockquote>"{{ item.claim }}"</blockquote>
          </div>
          
          <!-- Full analysis with integrated sources -->
          <div v-if="item.analysis" class="analysis-full">
            <h4>{{ t('workspace.analysis') }}</h4>
            <div 
              class="analysis-text markdown-summary full-content" 
              v-html="renderedFactCheckAnalysis"
            ></div>
          </div>
          
          <!-- Evidence section if available -->
          <div v-if="item.results && item.results.length > 0" class="evidence-section">
            <h4>{{ t('workspace.evidence') }}</h4>
            <div class="evidence-list">
              <div 
                v-for="(evidence, index) in item.results"
                :key="evidence.id || index"
                class="evidence-item"
              >
                <div class="evidence-title">{{ evidence.title }}</div>
                <div class="evidence-snippet">{{ evidence.snippet }}</div>
                <div v-if="evidence.url" class="evidence-source">
                  <a :href="evidence.url" target="_blank" rel="noopener noreferrer">
                    <ExternalLink :size="10" />
                    {{ evidence.domain || getUrlHostname(evidence.url) }}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="placeholder-content">
          <CheckCircle :size="32" />
          <p>{{ t('workspace.factcheckPlaceholder') }}</p>
        </div>
      </div>

      <!-- Document Content - Always Editable Like Word -->
      <div v-if="item.type === 'document'" class="document-content full-height">
        <div class="document-editor full-height">
          <Input.TextArea
            v-model:value="documentContent"
            :auto-size="false"
            :placeholder="t('workspace.documentPlaceholder')"
            @blur="autoSaveContent"
            @input="autoSaveContent"
            @keydown="handleDocumentKeyDown"
            class="word-like-textarea scrollable"
            ref="documentTextarea"
          />
        </div>
      </div>

      <!-- Webpage Content -->
      <div v-if="item.type === 'webpage'" class="webpage-content full-height">
        <div v-if="item.url" class="webpage-frame full-height">
          <div class="url-bar">
            <Globe :size="14" />
            <span class="url-text">{{ item.url }}</span>
            <Button 
              class="open-external-btn"
              size="small"
              @click="openExternal"
            >
              <ExternalLink :size="12" />
            </Button>
          </div>
          <div v-if="iframeError" class="iframe-fallback">
            <div class="fallback-content">
              <Globe :size="32" />
              <h4>{{ t('workspace.iframeBlocked') }}</h4>
              <p>{{ t('workspace.iframeBlockedDesc') }}</p>
              <Button type="primary" @click="openExternal">
                <ExternalLink :size="14" />
                {{ t('workspace.openInNewTab') }}
              </Button>
            </div>
          </div>
          <iframe 
            v-else
            :src="getProxiedUrl(item.url)"
            class="webpage-iframe"
            sandbox="allow-scripts allow-same-origin allow-forms allow-top-navigation"
            loading="lazy"
            @load="handleIframeLoad"
            @error="handleIframeError"
            ref="iframeRef"
          ></iframe>
        </div>
        <div v-else class="placeholder-content">
          <Globe :size="32" />
          <p>{{ t('workspace.webpagePlaceholder') }}</p>
        </div>
      </div>

      <!-- PDF Content -->
      <div v-if="item.type === 'pdf'" class="pdf-content full-height">
        <div v-if="item.fileUrl" class="pdf-frame full-height">
          <div class="pdf-bar">
            <FileText :size="14" />
            <span class="pdf-filename">{{ item.filename }}</span>
            <span class="pdf-size">{{ formatFileSize(item.fileSize) }}</span>
            <Button 
              class="download-pdf-btn"
              size="small"
              @click="downloadPDF"
            >
              <Download :size="12" />
            </Button>
            <Button 
              class="open-fullscreen-btn"
              size="small"
              @click="$emit('enlarge', item)"
            >
              <Expand :size="12" />
            </Button>
          </div>
          <iframe 
            :src="pdfIframeSrc"
            class="pdf-iframe"
            type="application/pdf"
            loading="lazy"
            ref="pdfIframe"
            @load="handlePDFLoad"
          ></iframe>
        </div>
        <div v-else class="placeholder-content">
          <FileText :size="32" />
          <p>{{ t('workspace.pdfPlaceholder') }}</p>
        </div>
      </div>
    </div>

    <div class="item-footer" v-if="item.createdAt">
      <span class="created-time">{{ formatTime(item.createdAt) }}</span>
    </div>

    <!-- Resize handles for free mode -->
    <div v-if="!isGridView" class="resize-handles">
      <div class="resize-handle se" @mousedown="startResize"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { Button, Dropdown, Menu, MenuItem, MenuDivider, Input, Modal } from 'ant-design-vue'
import { 
  Search, CheckCircle, FileText, Globe, 
  Maximize2, Minimize2, MoreHorizontal, Edit, Copy, Download, Trash2,
  ExternalLink, Expand
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { marked } from 'marked'
import { useCitationDeduplicator } from '../../composables/useCitationDeduplicator'

const { t } = useI18n()
const props = defineProps({
  item: Object,
  isGridView: Boolean
})

const emit = defineEmits(['update', 'remove', 'focus', 'enlarge', 'bring-to-front'])

const canvasItemRef = ref(null)
const isExpanded = ref(false)
const isEditing = ref(false)
const editingContent = ref('')
const documentContent = ref('')
const documentTextarea = ref(null)
const isDragging = ref(false)
const isResizing = ref(false)
const iframeError = ref(false)
const iframeRef = ref(null)
const pdfIframe = ref(null)
const loadingTimeout = ref(null)
const autoSaveTimeout = ref(null)

// For blob: URLs, avoid appending fragment parameters which can cause load errors
const pdfIframeSrc = computed(() => {
  // Prefer persistent data URL if available
  const url = props.item?.fileDataUrl || props.item?.fileUrl || ''
  if (!url) return ''
  if (url.startsWith('blob:')) return url
  const params = '#toolbar=0&navpanes=0&scrollbar=0&view=FitH&zoom=page-fit'
  return url.includes('#') ? url : `${url}${params}`
})

// Initialize deduplicator for citation handling
const deduplicator = useCitationDeduplicator()

// Initialize document content and watch for item changes
watch(() => props.item?.content, (newContent) => {
  if (props.item?.type === 'document') {
    documentContent.value = newContent || ''
  }
}, { immediate: true })

const typeIcon = computed(() => {
  const icons = {
    research: Search,
    factcheck: CheckCircle,
    document: FileText,
    pdf: FileText,
    webpage: Globe
  }
  return icons[props.item.type] || FileText
})

const typeLabel = computed(() => {
  const labels = {
    research: t('workspace.research'),
    factcheck: t('workspace.factCheck'),
    document: t('workspace.document'),
    pdf: 'PDF',
    webpage: t('workspace.webpage')
  }
  return labels[props.item.type] || ''
})

const freeViewStyle = computed(() => {
  try {
    if (props.isGridView) return {}
    
    const item = props.item
    if (!item) return {}
    
    // Define size constraints
    const minWidth = 200
    const maxWidth = 600
    const minHeight = 300
    const maxHeight = 800
    
    // Constrain dimensions
    const width = Math.max(minWidth, Math.min(maxWidth, item.size?.width || 400))
    const height = Math.max(minHeight, Math.min(maxHeight, item.size?.height || 500))
    
    return {
      position: 'absolute',
      left: `${item.position?.x || 0}px`,
      top: `${item.position?.y || 0}px`,
      width: `${width}px`,
      height: `${height}px`,
      maxWidth: `${maxWidth}px`,
      maxHeight: `${maxHeight}px`,
      minWidth: `${minWidth}px`,
      minHeight: `${minHeight}px`,
      zIndex: item.zIndex || 1
    }
  } catch (error) {
    console.warn('Error computing freeViewStyle:', error)
    return {}
  }
})

const displayResults = computed(() => {
  try {
    if (!props.item?.results || !Array.isArray(props.item.results)) return []
    return props.item.results.slice(0, isExpanded.value ? 10 : 3)
  } catch (error) {
    console.warn('Error computing displayResults:', error)
    return []
  }
})

// Rendered markdown for research content
const renderedMarkdownSummary = computed(() => {
  const summary = props.item?.analysis || props.item?.content || ''
  if (!summary) return ''

  try {
    // Reset deduplicator for fresh calculation
    deduplicator.reset()

    // Configure marked options
    marked.setOptions({
      breaks: true,
      gfm: true,
      sanitize: false,
      smartypants: true
    })

    const htmlContent = removeDuplicateCitations(marked(summary))
    return htmlContent
  } catch (error) {
    console.warn('Markdown parsing failed:', error)
    return summary.replace(/\n/g, '<br>')
  }
})

// Rendered markdown for fact-check analysis content
const renderedFactCheckAnalysis = computed(() => {
  const analysis = props.item?.analysis || ''
  if (!analysis) return ''

  try {
    // Reset deduplicator for fresh calculation
    deduplicator.reset()

    // Configure marked options
    marked.setOptions({
      breaks: true,
      gfm: true,
      sanitize: false,
      smartypants: true
    })

    const htmlContent = removeDuplicateCitations(marked(analysis))
    return htmlContent
  } catch (error) {
    console.warn('Markdown parsing failed:', error)
    return analysis.replace(/\n/g, '<br>')
  }
})

// Function to remove duplicate citations from markdown content
const removeDuplicateCitations = (htmlContent) => {
  if (!htmlContent) return ''

  // Create a temporary div to parse the HTML
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = htmlContent

  // Find all citation links
  const citationLinks = tempDiv.querySelectorAll('a[href]')

  citationLinks.forEach(link => {
    const url = link.getAttribute('href')
    const title = link.textContent.trim()

    // Check if this is a duplicate
    if (deduplicator.isDuplicate(url, title)) {
      // Remove the duplicate citation
      link.remove()
    } else {
      // Track this citation
      deduplicator.addCitation(url, title)
    }
  })

  return tempDiv.innerHTML
}

const getVerdictIcon = (verdict) => {
  const icons = {
    true: '✅',
    false: '❌',
    mixed: '⚠️',
    unverified: '❓'
  }
  return icons[verdict] || '❓'
}

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}

const bringToFront = (e) => {
  // Don't bring to front if clicking on interactive elements
  if (e.target.closest('.item-actions, .ant-btn, .ant-dropdown, input, textarea, iframe')) {
    return
  }
  
  // Emit focus event to bring this item to front
  emit('focus', props.item.id)
}

const startEditing = () => {
  isEditing.value = true
  editingContent.value = props.item.content || ''
  nextTick(() => {
    const textarea = canvasItemRef.value?.querySelector('textarea')
    if (textarea) textarea.focus()
  })
}

const saveContent = () => {
  if (editingContent.value !== props.item.content) {
    emit('update', props.item.id, { content: editingContent.value })
  }
  isEditing.value = false
}

const handleKeyDown = (e) => {
  if (e.key === 'Escape') {
    isEditing.value = false
    editingContent.value = props.item.content || ''
  } else if (e.key === 'Enter' && e.ctrlKey) {
    saveContent()
  }
}

// Auto-save document content with debouncing
const autoSaveContent = () => {
  if (autoSaveTimeout.value) {
    clearTimeout(autoSaveTimeout.value)
  }
  
  autoSaveTimeout.value = setTimeout(() => {
    if (documentContent.value !== props.item.content) {
      emit('update', props.item.id, { content: documentContent.value })
    }
  }, 500) // Save after 500ms of no typing
}

// Handle keyboard shortcuts in document mode
const handleDocumentKeyDown = (e) => {
  // Ctrl+S to save immediately
  if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    if (autoSaveTimeout.value) {
      clearTimeout(autoSaveTimeout.value)
    }
    emit('update', props.item.id, { content: documentContent.value })
  }
  // Allow normal text editing shortcuts
}

const formatContent = (content) => {
  return content.replace(/\n/g, '<br>')
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleDateString()
}

const openExternal = () => {
  if (props.item.url) {
    // Ensure URL has proper protocol for external opening
    let cleanUrl = props.item.url.trim()
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl
    }
    window.open(cleanUrl, '_blank', 'noopener,noreferrer')
  }
}

const downloadPDF = () => {
  if (props.item.fileUrl && props.item.filename) {
    const a = document.createElement('a')
    a.href = props.item.fileUrl
    a.download = props.item.filename
    a.click()
  }
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const handlePDFLoad = () => {
  // PDF loaded successfully, apply responsive scaling
  if (pdfIframe.value) {
    try {
      // Send message to PDF viewer to fit to container
      pdfIframe.value.contentWindow?.postMessage({
        type: 'setScale',
        scale: 'page-fit'
      }, '*')
    } catch (error) {
      console.log('PDF scaling message failed:', error)
    }
  }
}

// Resize observer for PDF scaling
let resizeObserver = null

onMounted(() => {
  if (props.item?.type === 'pdf' && canvasItemRef.value) {
    // Set up resize observer to handle container size changes
    resizeObserver = new ResizeObserver(() => {
      if (pdfIframe.value) {
        // Slight delay to ensure the container has finished resizing
        setTimeout(() => {
          handlePDFLoad()
        }, 100)
      }
    })
    
    resizeObserver.observe(canvasItemRef.value)
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})

const getProxiedUrl = (url) => {
  if (!url) return ''
  
  // Ensure URL has proper protocol
  let cleanUrl = url.trim()
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = 'https://' + cleanUrl
  }
  
  try {
    const urlObj = new URL(cleanUrl)
    
    // List of domains that commonly block iframe embedding
    const blockedDomains = [
      'google.com', 'www.google.com', 'facebook.com', 'www.facebook.com',
      'twitter.com', 'www.twitter.com', 'x.com', 'www.x.com',
      'youtube.com', 'www.youtube.com', 'instagram.com', 'www.instagram.com',
      'github.com', 'www.github.com', 'stackoverflow.com', 'www.stackoverflow.com'
    ]
    
    // Check if domain is known to block iframes
    if (blockedDomains.includes(urlObj.hostname.toLowerCase())) {
      // Trigger error state immediately for known blocked domains
      setTimeout(() => handleIframeError(), 100)
      return '' // Don't try to load
    }
    
    // For other URLs, try a proxy service or return direct URL
    // Note: Many free proxy services have limitations, so we'll use direct URL
    // and handle errors gracefully
    return cleanUrl
  } catch (error) {
    console.warn('Invalid URL:', url)
    return ''
  }
}

const handleIframeLoad = () => {
  // Clear any loading timeout
  if (loadingTimeout.value) {
    clearTimeout(loadingTimeout.value)
    loadingTimeout.value = null
  }
  console.log('Iframe loaded successfully:', props.item.url)
}

const handleIframeError = () => {
  console.warn('Iframe failed to load:', props.item.url)
  iframeError.value = true
  
  // Clear any loading timeout
  if (loadingTimeout.value) {
    clearTimeout(loadingTimeout.value)
    loadingTimeout.value = null
  }
}

// Helper function to extract hostname from URL
const getUrlHostname = (url) => {
  try {
    return new URL(url).hostname
  } catch (error) {
    return url || 'Unknown source'
  }
}

// Set up a timeout to detect loading failures
const setupLoadingTimeout = () => {
  if (loadingTimeout.value) {
    clearTimeout(loadingTimeout.value)
  }
  
  // Give iframe 10 seconds to load
  loadingTimeout.value = setTimeout(() => {
    if (!iframeError.value && iframeRef.value) {
      console.warn('Iframe loading timeout:', props.item.url)
      handleIframeError()
    }
  }, 10000)
}

const handleAction = ({ key }) => {
  switch (key) {
    case 'edit':
      if (props.item.type === 'document') {
        // Focus the always-visible textarea
        nextTick(() => {
          if (documentTextarea.value) {
            documentTextarea.value.focus()
          }
        })
      }
      break
    case 'duplicate':
      const duplicateData = {
        ...props.item,
        title: `${props.item.title} (Copy)`,
        position: {
          x: (props.item.position?.x || 0) + 20,
          y: (props.item.position?.y || 0) + 20
        }
      }
      delete duplicateData.id
      emit('update', 'new', duplicateData)
      break
    case 'export':
      exportItem()
      break
    case 'delete':
      Modal.confirm({
        title: 'Delete Item',
        content: t('workspace.confirmDelete'),
        okText: 'Yes, Delete',
        okType: 'danger',
        cancelText: 'Cancel',
        onOk() {
          emit('remove', props.item.id)
        }
      })
      break
  }
}

const exportItem = () => {
  const data = JSON.stringify(props.item, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.item.title || 'canvas-item'}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const startDrag = (e) => {
  if (props.isGridView || isEditing.value) return
  
  // Only allow dragging from header, not from buttons or actions
  if (e.target.closest('.item-actions, .ant-btn, .ant-dropdown')) return
  
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = true
  
  const rect = canvasItemRef.value?.getBoundingClientRect()
  const containerRect = canvasItemRef.value?.offsetParent?.getBoundingClientRect() || { left: 0, top: 0 }
  
  if (!rect) return
  
  const offsetX = e.clientX - rect.left
  const offsetY = e.clientY - rect.top
  
  // Add transform for immediate visual feedback
  const element = canvasItemRef.value
  if (!element) return
  
  element.style.transition = 'none'
  element.style.zIndex = '1000'
  element.style.opacity = '1'
  element.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)'
  element.style.transform = 'scale(1.02)'
  
  let animationId = null
  let lastX = props.item.position?.x || 0
  let lastY = props.item.position?.y || 0
  
  const handleMouseMove = (moveEvent) => {
    if (!isDragging.value) return
    
    // Cancel previous animation frame
    if (animationId) {
      cancelAnimationFrame(animationId)
    }
    
    // Use requestAnimationFrame for smooth animation
    animationId = requestAnimationFrame(() => {
      const newX = moveEvent.clientX - containerRect.left - offsetX
      const newY = moveEvent.clientY - containerRect.top - offsetY
      
      const clampedX = Math.max(0, Math.min(newX, (containerRect.width || 800) - rect.width))
      const clampedY = Math.max(0, Math.min(newY, (containerRect.height || 600) - rect.height))
      
      // Apply transform immediately for visual feedback with scaling
      element.style.transform = `scale(1.02) translate(${clampedX - lastX}px, ${clampedY - lastY}px)`
      
      // Throttle actual position updates
      if (Math.abs(clampedX - lastX) > 5 || Math.abs(clampedY - lastY) > 5) {
        lastX = clampedX
        lastY = clampedY
        
        emit('update', props.item.id, {
          position: { x: clampedX, y: clampedY }
        })
      }
    })
  }
  
  const handleMouseUp = () => {
    isDragging.value = false
    
    if (animationId) {
      cancelAnimationFrame(animationId)
    }
    
    // Reset visual state
    element.style.transition = ''
    element.style.transform = ''
    element.style.zIndex = ''
    element.style.opacity = ''
    element.style.boxShadow = ''
    
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
    
    // Final position update
    emit('update', props.item.id, {
      position: { x: lastX, y: lastY }
    })
  }
  
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'move'
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  
  emit('focus', props.item.id)
}

const startResize = (e) => {
  e.stopPropagation()
  isResizing.value = true
  
  const startX = e.clientX
  const startY = e.clientY
  const startWidth = props.item.size?.width || 400
  const startHeight = props.item.size?.height || 500
  
  // Define size constraints matching freeViewStyle
  const minWidth = 300
  const maxWidth = 800
  const minHeight = 200
  const maxHeight = 600
  
  const element = canvasItemRef.value
  element.style.transition = 'none'
  
  let animationId = null
  let lastWidth = startWidth
  let lastHeight = startHeight
  
  const handleMouseMove = (moveEvent) => {
    if (!isResizing.value) return
    
    // Cancel previous animation frame
    if (animationId) {
      cancelAnimationFrame(animationId)
    }
    
    // Use requestAnimationFrame for smooth resizing
    animationId = requestAnimationFrame(() => {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY
      
      // Apply size constraints
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + deltaX))
      const newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight + deltaY))
      
      // Apply size immediately for visual feedback
      element.style.width = `${newWidth}px`
      element.style.height = `${newHeight}px`
      
      // Throttle actual size updates
      if (Math.abs(newWidth - lastWidth) > 10 || Math.abs(newHeight - lastHeight) > 10) {
        lastWidth = newWidth
        lastHeight = newHeight
        
        emit('update', props.item.id, {
          size: { width: newWidth, height: newHeight }
        })
      }
    })
  }
  
  const handleMouseUp = () => {
    isResizing.value = false
    
    if (animationId) {
      cancelAnimationFrame(animationId)
    }
    
    // Reset visual state
    element.style.transition = ''
    element.style.width = ''
    element.style.height = ''
    
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
    
    // Final size update
    emit('update', props.item.id, {
      size: { width: lastWidth, height: lastHeight }
    })
  }
  
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'se-resize'
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}
</script>

<style scoped>
.canvas-item {
  background: #fff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  transition: all 0.2s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.canvas-item:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.canvas-item.grid-mode {
  position: static;
  cursor: default;
}

.canvas-item.free-mode {
  cursor: default;
  resize: none;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
  flex-shrink: 0; /* Prevent header from shrinking */
}

.item-header.drag-handle {
  user-select: none;
}

.canvas-item.free-mode .item-header.drag-handle {
  cursor: move;
}

.canvas-item.grid-mode .item-header.drag-handle {
  cursor: default;
}

.item-type-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.item-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  border: none;
  background: none;
  padding: 4px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.6;
}

.action-btn:hover {
  background: #f0f0f0;
  opacity: 1;
}

.enlarge-btn {
  background: #f0f7ff;
  border-color: #91caff;
  color: #1890ff;
}

.enlarge-btn:hover {
  background: #e6f4ff;
  border-color: #69b1ff;
  color: #096dd9;
}

.item-title {
  padding: 12px 16px 8px 16px;
}

.item-title h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
}

.item-content {
  padding: 0 16px 12px 16px;
  flex: 1;
  overflow: hidden; /* Parent container should not scroll */
  height: 0; /* Allow flex to determine actual height */
  display: flex;
  flex-direction: column;
  min-height: 0; /* Allow content to shrink */
}

.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 32px 16px;
  color: #999;
  min-height: 120px;
}

.placeholder-content p {
  margin: 12px 0;
  font-size: 14px;
}

/* Research specific styles */
.research-summary {
  margin-bottom: 16px;
  padding: 12px;
  background: #f0f7ff;
  border-radius: 6px;
  border-left: 3px solid #1890ff;
}

.summary-text {
  font-size: 13px;
  line-height: 1.5;
  color: #333;
}

/* Enhanced Markdown Summary Styling */
.markdown-summary {
  font-size: 13px;
  line-height: 1.5;
  color: #333;
  font-family: 'DM Sans', 'LXGW WenKai', serif;
}

.markdown-summary :deep(h1) {
  font-size: 16px;
  font-weight: 600;
  margin: 12px 0 8px 0;
  color: #000;
}

.markdown-summary :deep(h2) {
  font-size: 15px;
  font-weight: 600;
  margin: 10px 0 6px 0;
  color: #000;
}

.markdown-summary :deep(h3) {
  font-size: 14px;
  font-weight: 600;
  margin: 8px 0 4px 0;
  color: #000;
}

.markdown-summary :deep(p) {
  margin: 8px 0;
  text-align: justify;
}

.markdown-summary :deep(ul), 
.markdown-summary :deep(ol) {
  margin: 8px 0;
  padding-left: 16px;
}

.markdown-summary :deep(li) {
  margin: 4px 0;
}

.markdown-summary :deep(a) {
  color: #0066cc;
  text-decoration: none;
}

.markdown-summary :deep(a:hover) {
  text-decoration: underline;
}

.markdown-summary :deep(blockquote) {
  border-left: 2px solid #e8e8e8;
  padding-left: 8px;
  margin: 8px 0;
  font-style: italic;
  color: #666;
}

/* Enhanced Result Item Styling */
.result-source {
  margin-top: 4px;
}

.result-source a {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #1890ff;
  text-decoration: none;
  font-size: 11px;
}

.result-source a:hover {
  text-decoration: underline;
}

/* Limitations Preview Styling */
.limitations-preview {
  margin-top: 12px;
  padding: 8px;
  background: #fff8dc;
  border-radius: 4px;
  border-left: 3px solid #f0e68c;
}

.limitations-header {
  font-size: 12px;
  font-weight: 600;
  color: #333;
  margin-bottom: 6px;
}

.limitations-content {
  font-size: 11px;
  color: #666;
}

.limitation-item {
  margin-bottom: 4px;
  line-height: 1.3;
}

.more-items {
  color: #999;
  font-style: italic;
  margin-top: 4px;
}

.result-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 4px;
}

.result-count {
  font-size: 12px;
  color: #666;
}

.result-status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  text-transform: uppercase;
  font-weight: 600;
}

.result-status.completed {
  background: #f6ffed;
  color: #52c41a;
}

.result-status.pending {
  background: #fff7e6;
  color: #fa8c16;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-item {
  padding: 8px;
  background: #fafafa;
  border-radius: 4px;
  border-left: 3px solid #e9ecef;
}

.result-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.result-snippet {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
}

/* Fact check specific styles */
.verdict-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 12px;
}

.verdict-badge.true {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
}

.verdict-badge.false {
  background: #fff2f0;
  border: 1px solid #ffb3b3;
}

.verdict-badge.mixed {
  background: #fffbe6;
  border: 1px solid #ffe58f;
}

.verdict-icon {
  font-size: 16px;
}

.verdict-text {
  font-weight: 600;
  text-transform: uppercase;
  font-size: 12px;
  letter-spacing: 0.5px;
}

.confidence-score {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.claim-text {
  font-style: italic;
  font-size: 13px;
  color: #333;
  line-height: 1.4;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 4px;
  border-left: 3px solid #1890ff;
  margin-bottom: 12px;
}

.analysis-preview,
.analysis-full {
  margin-top: 12px;
}

.analysis-text {
  font-size: 13px;
  line-height: 1.5;
  color: #333;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 4px;
}

/* Document specific styles - Word-like interface */
.document-editor {
  background: #ffffff;
  border-radius: 4px;
  padding: 12px;
}

.word-like-textarea {
  border: none !important;
  resize: none !important;
  width: 100% !important;
  height: 100% !important;
  background: #ffffff !important;
  font-family: 'Times New Roman', 'Crimson Text', serif !important;
  font-size: 14px !important;
  line-height: 1.6 !important;
  color: #333 !important;
  padding: 8px !important;
  box-shadow: none !important;
  outline: none !important;
  min-height: 100% !important;
}

.word-like-textarea:focus {
  box-shadow: none !important;
  border: none !important;
  outline: none !important;
}

.word-like-textarea::placeholder {
  color: #999;
  font-style: italic;
}

/* Hide Ant Design textarea styling */
.word-like-textarea.ant-input {
  border: none !important;
  box-shadow: none !important;
}

.document-display {
  min-height: 80px;
  cursor: text;
}

.document-text {
  font-size: 14px;
  line-height: 1.6;
  color: #333;
}

/* Webpage specific styles */
.url-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  font-size: 12px;
}

.url-text {
  flex: 1;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.open-external-btn {
  padding: 2px 6px;
  height: auto;
  min-height: auto;
}

.webpage-iframe {
  width: 100%;
  height: calc(100% - 40px); /* Full height minus url bar */
  min-height: 200px;
  border: none;
  background: #fff;
}

.iframe-fallback {
  height: calc(100% - 40px); /* Full height minus url bar */
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
}

.fallback-content {
  text-align: center;
  padding: 20px;
  color: #666;
}

.fallback-content h4 {
  margin: 12px 0 8px 0;
  font-size: 14px;
  color: #333;
}

.fallback-content p {
  margin: 0 0 16px 0;
  font-size: 12px;
  line-height: 1.4;
}

/* PDF specific styles */
.pdf-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  font-size: 12px;
}

.pdf-filename {
  flex: 1;
  color: #333;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pdf-size {
  color: #666;
  font-size: 11px;
}

.download-pdf-btn {
  padding: 2px 6px;
  height: auto;
  min-height: auto;
}

.pdf-iframe {
  width: 100%;
  height: calc(100% - 40px);
  min-height: 200px;
  border: none;
  background: #fff;
  object-fit: contain;
  transform-origin: top left;
  overflow: hidden;
}

.pdf-frame {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.pdf-content {
  overflow: hidden;
}

.pdf-content .pdf-frame {
  overflow: hidden;
}

.item-footer {
  padding: 8px 16px;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
}

.created-time {
  font-size: 11px;
  color: #999;
}

/* Resize handles */
.resize-handles {
  position: absolute;
  bottom: 0;
  right: 0;
}

.resize-handle {
  position: absolute;
  background: #1890ff;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.canvas-item:hover .resize-handle {
  opacity: 0.7;
}

.resize-handle.se {
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  cursor: se-resize;
  border-top-left-radius: 4px;
}

/* Type-specific border colors */
.canvas-item.type-research {
  border-left: 4px solid #52c41a;
}

.canvas-item.type-factcheck {
  border-left: 4px solid #1890ff;
}

.canvas-item.type-document {
  border-left: 4px solid #722ed1;
}

.canvas-item.type-pdf {
  border-left: 4px solid #ff6b35;
}

.canvas-item.type-webpage {
  border-left: 4px solid #fa8c16;
}

/* Menu styling */
:deep(.ant-dropdown-menu-item.danger-item) {
  color: #ff4d4f;
}

:deep(.ant-dropdown-menu-item.danger-item:hover) {
  background: #fff2f0;
}

/* Utility classes for full height layout */
.full-height {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0; /* Allow flex shrinking */
}

.scrollable {
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  min-height: 0; /* Allow flex shrinking */
}

.full-height-textarea {
  height: 100% !important;
  min-height: 200px !important;
  resize: none !important;
}

/* Ensure webpage frame uses full height */
.webpage-frame {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* Make document display scrollable */
.document-display {
  overflow-y: auto;
  flex: 1;
}

/* Research results layout */
.research-results {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  min-height: 0;
}

.full-research-display {
  padding: 4px 0;
}

.limitations-section, 
.recommendations-section {
  margin-top: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 4px;
  border-left: 3px solid #1890ff;
}

.limitations-section h4, 
.recommendations-section h4 {
  margin: 0 0 8px 0;
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.limitations-list, 
.recommendations-list {
  margin: 0;
  padding-left: 16px;
  list-style-type: disc;
}

.limitations-list li, 
.recommendations-list li {
  margin: 4px 0;
  font-size: 12px;
  line-height: 1.4;
  color: #666;
}

.result-list {
  flex: 1;
  overflow-y: auto;
}

/* Factcheck results layout */
.factcheck-results {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
</style>