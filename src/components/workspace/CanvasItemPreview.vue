<template>
  <div class="canvas-item-preview">
    <div v-if="!item" class="no-selection">
      <div class="no-selection-content">
        <div class="preview-icon">👁️</div>
        <h3>{{ t('workspace.noItemSelected') }}</h3>
        <p>{{ t('workspace.selectItemToPreview') }}</p>
      </div>
    </div>

    <div v-else class="preview-container">
      <div class="preview-header">
        <div class="header-info">
          <component :is="typeIcon" :size="20" />
          <h2>{{ item.title || t(`workspace.${item.type}`) }}</h2>
          <span class="type-badge">{{ t(`workspace.${item.type}`) }}</span>
        </div>
        
        <div class="header-actions">
          <Button class="close-btn" @click="$emit('close')">
            <X :size="16" />
          </Button>
        </div>
      </div>

      <div class="preview-content" ref="contentContainer">
        <!-- PDF Content -->
        <div v-if="item.type === 'pdf'" class="pdf-preview">
          <div class="pdf-bar">
            <FileText :size="14" />
            <span class="pdf-filename">{{ item.filename }}</span>
            <span class="pdf-size" v-if="item.fileSize">{{ formatFileSize(item.fileSize) }}</span>
            <div class="spacer"></div>
            <Button size="small" class="download-pdf-btn" @click="downloadPDF">
              <ExternalLink :size="12" />
              {{ t('workspace.openExternal') }}
            </Button>
          </div>
          <iframe
            :src="pdfPreviewSrc"
            class="pdf-iframe-full"
            type="application/pdf"
            loading="lazy"
          ></iframe>
        </div>
        <!-- Research Content - Full ResearchResults.vue Integration -->
        <div v-if="item.type === 'research'" class="research-preview full-research-view">
          <div v-if="item.analysis || (item.results && item.results.length > 0)" class="full-research-report">
            <!-- Research Header -->
            <div class="research-header">
              <h2 class="research-title">{{ item.title || t('research.title') }}</h2>
              <div class="research-info">
                <span class="research-mode">{{ t('research.mode') }}</span>
                <span class="research-date" v-if="item.timestamp">{{ formatDate(item.timestamp) }}</span>
              </div>
            </div>

            <!-- Full Research Content with Markdown Rendering -->
            <div class="research-content-section">
              <div class="markdown-content" v-html="renderedMarkdown"></div>
            </div>
            
            <!-- Deduplicated Sources Section -->
            <div v-if="deduplicatedSources && deduplicatedSources.length > 0" class="sources-section" id="sources-section">
              <div class="sources-header" @click="toggleSourcesCollapsed" :class="{ 'collapsed': isSourcesCollapsed }">
                <h3 class="section-title">
                  {{ t('research.sources') }}
                  <span class="sources-count">({{ deduplicatedSources.length }})</span>
                </h3>
                <div class="collapse-indicator" :class="{ 'collapsed': isSourcesCollapsed }">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </div>
              
              <div class="sources-content" :class="{ 'collapsed': isSourcesCollapsed }">
                <div class="sources-inner">
                  <div class="sources-grid">
                    <div
                      v-for="(source, index) in deduplicatedSources"
                      :key="index"
                      class="source-card"
                    >
                      <div class="source-header">
                        <h4 class="source-title">
                          <a :href="source.url" target="_blank" rel="noopener noreferrer">
                            {{ source.title || source.url }}
                          </a>
                        </h4>
                        <div class="source-meta">
                          <span class="source-publisher" v-if="source.publisher">
                            {{ source.publisher }}
                          </span>
                          <span class="source-relevance" v-if="source.relevance">
                            {{ source.relevance }}% {{ t('research.relevance') }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Limitations Section -->
            <div v-if="researchLimitations && researchLimitations.length > 0" class="limitations-section">
              <h3 class="section-title">{{ t('research.limitations') }}</h3>
              <ul class="limitations-list">
                <li v-for="(limitation, index) in researchLimitations" :key="index">
                  {{ limitation }}
                </li>
              </ul>
            </div>

            <!-- Recommendations Section -->
            <div v-if="researchRecommendations && researchRecommendations.length > 0" class="recommendations-section">
              <h3 class="section-title">{{ t('research.recommendations') }}</h3>
              <ul class="recommendations-list">
                <li v-for="(recommendation, index) in researchRecommendations" :key="index">
                  {{ recommendation }}
                </li>
              </ul>
            </div>
          </div>
          <div v-else class="placeholder-preview">
            <Search :size="48" />
            <h4>{{ t('workspace.noResearchData') }}</h4>
            <p>{{ t('workspace.noResearchDataDesc') }}</p>
          </div>
        </div>

        <!-- Fact Check Content -->
        <div v-if="item.type === 'factcheck'" class="factcheck-preview">
          <div v-if="item.verdict || item.analysis" class="factcheck-results">
            <div class="verdict-display" v-if="item.verdict">
              <div class="verdict-badge" :class="item.verdict">
                <span class="verdict-icon">{{ getVerdictIcon(item.verdict) }}</span>
                <span class="verdict-text">{{ t(`verdict.${item.verdict}`) || item.verdict }}</span>
              </div>
              <div class="confidence-bar" v-if="item.confidence">
                <div class="confidence-fill" :style="{ width: `${item.confidence}%` }"></div>
                <span class="confidence-text">{{ item.confidence }}% {{ t('workspace.confidence') }}</span>
              </div>
            </div>
            
            <div class="claim-display" v-if="item.claim">
              <h4>{{ t('workspace.claimAnalyzed') }}</h4>
              <blockquote>{{ item.claim }}</blockquote>
            </div>
            
            <div class="analysis-display" v-if="item.analysis">
              <h4>{{ t('workspace.analysis') }}</h4>
              <div class="analysis-text" v-html="formatText(item.analysis)"></div>
            </div>
            
            <!-- Show evidence/sources if available -->
            <div v-if="item.results && item.results.length > 0" class="evidence-display">
              <h4>{{ t('workspace.evidence') }}</h4>
              <div class="evidence-list">
                <div 
                  v-for="(evidence, index) in item.results.slice(0, 8)"
                  :key="evidence.id || index"
                  class="evidence-item"
                >
                  <div class="evidence-title">{{ evidence.title }}</div>
                  <div class="evidence-snippet">{{ evidence.snippet }}</div>
                  <div class="evidence-source" v-if="evidence.url">
                    <a :href="evidence.url" target="_blank" rel="noopener noreferrer">
                      <ExternalLink :size="12" />
                      {{ evidence.domain || getUrlHostname(evidence.url) }}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="placeholder-preview">
            <CheckCircle :size="48" />
            <h4>{{ t('workspace.noFactCheckData') }}</h4>
            <p>{{ t('workspace.noFactCheckDataDesc') }}</p>
          </div>
        </div>

        <!-- Document Content -->
        <div v-if="item.type === 'document'" class="document-preview">
          <div class="document-editor">
            <!-- Rich Text Toolbar -->
            <div class="rich-text-toolbar">
              <div class="toolbar-group">
                <Button size="small" @click="applyFormat('bold')" :class="{ active: isFormatActive('bold') }">
                  <strong>B</strong>
                </Button>
                <Button size="small" @click="applyFormat('italic')" :class="{ active: isFormatActive('italic') }">
                  <em>I</em>
                </Button>
                <Button size="small" @click="applyFormat('h1')">
                  H1
                </Button>
                <Button size="small" @click="applyFormat('h2')">
                  H2
                </Button>
                <Button size="small" @click="applyFormat('h3')">
                  H3
                </Button>
              </div>
              <div class="toolbar-group">
                <span class="auto-save-indicator" :class="{ saving: isSaving, saved: lastSaved }">
                  {{ isSaving ? t('workspace.saving') + '...' : (lastSaved ? t('workspace.saved') : '') }}
                </span>
              </div>
            </div>
            
            <Input.TextArea
              v-model:value="editingContent"
              :placeholder="t('workspace.documentPlaceholder')"
              class="document-textarea"
              :auto-size="false"
              @input="onContentChange"
              @keydown="handleKeyDown"
              ref="documentTextArea"
            />
          </div>
        </div>

        <!-- Webpage Content -->
        <div v-if="item.type === 'webpage'" class="webpage-preview">
          <div v-if="item.url" class="webpage-container">
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
            <iframe 
              :src="getProxiedUrl(item.url)"
              class="webpage-iframe"
              sandbox="allow-scripts allow-same-origin allow-forms allow-top-navigation"
              loading="lazy"
              @error="handleIframeError"
            ></iframe>
          </div>
          <div v-else class="placeholder-preview">
            <Globe :size="48" />
            <h4>{{ t('workspace.noWebpageUrl') }}</h4>
            <p>{{ t('workspace.noWebpageUrlDesc') }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { Button, Input } from 'ant-design-vue'
import { 
  Search, CheckCircle, FileText, Globe, Edit, X, ExternalLink
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { marked } from 'marked'
import { useCitationDeduplicator } from '../../composables/useCitationDeduplicator'

const { t } = useI18n()
const props = defineProps({
  item: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'update'])

const editingContent = ref('')
const contentContainer = ref(null)
const documentTextArea = ref(null)
const isSaving = ref(false)
const lastSaved = ref(false)
const autoSaveTimeout = ref(null)
// Initialize document content on mount
onMounted(() => {
  if (props.item?.type === 'document') {
    editingContent.value = props.item.content || ''
    nextTick(() => {
      // Debug: Check what we have in the ref
      console.log('DocumentTextArea ref on mount:', documentTextArea.value)
      if (documentTextArea.value) {
        console.log('DocumentTextArea properties:', Object.keys(documentTextArea.value))
        console.log('DocumentTextArea $refs:', documentTextArea.value.$refs)
        console.log('DocumentTextArea $el:', documentTextArea.value.$el)
      }
      
      const textarea = documentTextArea.value?.$refs?.resizableTextArea?.textArea ||
                      documentTextArea.value?.$el?.querySelector('textarea') ||
                      contentContainer.value?.querySelector('textarea')
      if (textarea) textarea.focus()
    })
  }
})
const isSourcesCollapsed = ref(true) // Start collapsed by default

// Initialize deduplicator for citation handling
const deduplicator = useCitationDeduplicator()

const typeIcon = computed(() => {
  if (!props.item) return null
  const icons = {
    research: Search,
    factcheck: CheckCircle,
    document: FileText,
    webpage: Globe
  }
  return icons[props.item.type] || FileText
})

const displayResults = computed(() => {
  if (!props.item?.results) return []
  return props.item.results.slice(0, 6) // Show first 6 results in preview
})

// Computed property for deduplicated sources (matching ResearchResults.vue)
const deduplicatedSources = computed(() => {
  if (!props.item?.results || !Array.isArray(props.item.results)) {
    return []
  }

  const seenUrls = new Set()
  const uniqueSources = []

  for (const source of props.item.results) {
    const url = source.url || source.link || source.href
    if (url && !seenUrls.has(url)) {
      seenUrls.add(url)
      uniqueSources.push({
        ...source,
        url: url,
        title: source.title || source.name || url,
        publisher: source.publisher || source.domain || (url ? getUrlHostname(url) : ''),
        relevance: source.relevance
      })
    }
  }

  return uniqueSources
})

// Research limitations from item data
const researchLimitations = computed(() => {
  return props.item?.limitations || []
})

// Research recommendations from item data  
const researchRecommendations = computed(() => {
  return props.item?.recommendations || []
})

// Full markdown rendering with citation deduplication (matching ResearchResults.vue)
const renderedMarkdown = computed(() => {
  const summary = props.item?.analysis || props.item?.content || ''
  if (!summary) return ''

  // Reset deduplicator for fresh calculation
  deduplicator.reset()

  // Configure marked options (same as ResearchResults.vue)
  marked.setOptions({
    breaks: true,
    gfm: true,
    sanitize: false,
    smartypants: true
  })

  const htmlContent = removeDuplicateCitations(marked(summary))
  return htmlContent
})

// Function to remove duplicate citations from markdown content (from ResearchResults.vue)
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

// Date formatting helper
const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString()
}


const saveContent = async () => {
  isSaving.value = true
  try {
    emit('update', props.item.id, { content: editingContent.value })
    lastSaved.value = true
    setTimeout(() => {
      lastSaved.value = false
    }, 2000)
  } catch (error) {
    console.error('Error saving content:', error)
  } finally {
    isSaving.value = false
  }
}

// Auto-save functionality
const onContentChange = () => {
  if (autoSaveTimeout.value) {
    clearTimeout(autoSaveTimeout.value)
  }
  
  autoSaveTimeout.value = setTimeout(async () => {
    if (editingContent.value !== props.item?.content) {
      isSaving.value = true
      try {
        emit('update', props.item.id, { content: editingContent.value })
        lastSaved.value = true
        setTimeout(() => {
          lastSaved.value = false
        }, 2000)
      } catch (error) {
        console.error('Auto-save error:', error)
      } finally {
        isSaving.value = false
      }
    }
  }, 1500) // Auto-save after 1.5 seconds of no typing
}

// Rich text formatting functions
const applyFormat = (format) => {
  // Try multiple methods to get the textarea element
  let textarea = null
  
  if (documentTextArea.value) {
    // Method 1: Try the Ant Design internal reference
    textarea = documentTextArea.value.$refs?.resizableTextArea?.textArea
    
    // Method 2: Try direct $el access
    if (!textarea && documentTextArea.value.$el) {
      textarea = documentTextArea.value.$el.querySelector('textarea')
    }
    
    // Method 3: Try getting from the component's root element
    if (!textarea) {
      const rootEl = documentTextArea.value.$el || documentTextArea.value
      if (rootEl?.tagName === 'TEXTAREA') {
        textarea = rootEl
      } else if (rootEl?.querySelector) {
        textarea = rootEl.querySelector('textarea')
      }
    }
  }
  
  // Method 4: Last resort - search in content container
  if (!textarea && contentContainer.value) {
    textarea = contentContainer.value.querySelector('textarea')
  }
  
  if (!textarea) {
    console.warn('Textarea not found. Using fallback method without selection.')
    // Fallback: Apply formatting at the end of the content
    const currentLength = editingContent.value.length
    
    switch (format) {
      case 'bold':
        editingContent.value += '\n**bold text**'
        break
      case 'italic':
        editingContent.value += '\n*italic text*'
        break
      case 'h1':
        editingContent.value += '\n# Heading 1'
        break
      case 'h2':
        editingContent.value += '\n## Heading 2'
        break
      case 'h3':
        editingContent.value += '\n### Heading 3'
        break
    }
    
    // Try to focus the textarea after adding content
    nextTick(() => {
      const fallbackTextarea = contentContainer.value?.querySelector('textarea')
      if (fallbackTextarea) {
        fallbackTextarea.focus()
        fallbackTextarea.setSelectionRange(editingContent.value.length, editingContent.value.length)
      }
    })
    return
  }
  
  const start = textarea.selectionStart || 0
  const end = textarea.selectionEnd || 0
  const selectedText = editingContent.value.substring(start, end)
  let formattedText = ''
  let newCursorPos = start
  
  switch (format) {
    case 'bold':
      if (selectedText) {
        formattedText = `**${selectedText}**`
        newCursorPos = start + formattedText.length
      } else {
        formattedText = '**bold text**'
        newCursorPos = start + 2 // Position cursor between asterisks
      }
      break
    case 'italic':
      if (selectedText) {
        formattedText = `*${selectedText}*`
        newCursorPos = start + formattedText.length
      } else {
        formattedText = '*italic text*'
        newCursorPos = start + 1 // Position cursor between asterisks
      }
      break
    case 'h1':
      // Add heading at the beginning of the line
      const lineStart = editingContent.value.lastIndexOf('\n', start - 1) + 1
      const lineEnd = editingContent.value.indexOf('\n', start)
      const currentLine = editingContent.value.substring(lineStart, lineEnd === -1 ? editingContent.value.length : lineEnd)
      
      if (currentLine.startsWith('# ')) {
        // Remove existing H1
        formattedText = currentLine.substring(2)
        editingContent.value = editingContent.value.substring(0, lineStart) + formattedText + editingContent.value.substring(lineEnd === -1 ? editingContent.value.length : lineEnd)
        newCursorPos = lineStart + formattedText.length
      } else {
        formattedText = `# ${currentLine}`
        editingContent.value = editingContent.value.substring(0, lineStart) + formattedText + editingContent.value.substring(lineEnd === -1 ? editingContent.value.length : lineEnd)
        newCursorPos = lineStart + formattedText.length
      }
      
      nextTick(() => {
        textarea.setSelectionRange(newCursorPos, newCursorPos)
        textarea.focus()
      })
      return
      
    case 'h2':
      const lineStart2 = editingContent.value.lastIndexOf('\n', start - 1) + 1
      const lineEnd2 = editingContent.value.indexOf('\n', start)
      const currentLine2 = editingContent.value.substring(lineStart2, lineEnd2 === -1 ? editingContent.value.length : lineEnd2)
      
      if (currentLine2.startsWith('## ')) {
        formattedText = currentLine2.substring(3)
        editingContent.value = editingContent.value.substring(0, lineStart2) + formattedText + editingContent.value.substring(lineEnd2 === -1 ? editingContent.value.length : lineEnd2)
        newCursorPos = lineStart2 + formattedText.length
      } else {
        formattedText = `## ${currentLine2}`
        editingContent.value = editingContent.value.substring(0, lineStart2) + formattedText + editingContent.value.substring(lineEnd2 === -1 ? editingContent.value.length : lineEnd2)
        newCursorPos = lineStart2 + formattedText.length
      }
      
      nextTick(() => {
        textarea.setSelectionRange(newCursorPos, newCursorPos)
        textarea.focus()
      })
      return
      
    case 'h3':
      const lineStart3 = editingContent.value.lastIndexOf('\n', start - 1) + 1
      const lineEnd3 = editingContent.value.indexOf('\n', start)
      const currentLine3 = editingContent.value.substring(lineStart3, lineEnd3 === -1 ? editingContent.value.length : lineEnd3)
      
      if (currentLine3.startsWith('### ')) {
        formattedText = currentLine3.substring(4)
        editingContent.value = editingContent.value.substring(0, lineStart3) + formattedText + editingContent.value.substring(lineEnd3 === -1 ? editingContent.value.length : lineEnd3)
        newCursorPos = lineStart3 + formattedText.length
      } else {
        formattedText = `### ${currentLine3}`
        editingContent.value = editingContent.value.substring(0, lineStart3) + formattedText + editingContent.value.substring(lineEnd3 === -1 ? editingContent.value.length : lineEnd3)
        newCursorPos = lineStart3 + formattedText.length
      }
      
      nextTick(() => {
        textarea.setSelectionRange(newCursorPos, newCursorPos)
        textarea.focus()
      })
      return
  }
  
  // For bold and italic formatting
  const newContent = 
    editingContent.value.substring(0, start) + 
    formattedText + 
    editingContent.value.substring(end)
  
  editingContent.value = newContent
  
  // Set cursor position
  nextTick(() => {
    textarea.setSelectionRange(newCursorPos, newCursorPos)
    textarea.focus()
  })
}

const isFormatActive = (format) => {
  // Use the same textarea finding logic as applyFormat
  let textarea = null
  
  if (documentTextArea.value) {
    textarea = documentTextArea.value.$refs?.resizableTextArea?.textArea
    if (!textarea && documentTextArea.value.$el) {
      textarea = documentTextArea.value.$el.querySelector('textarea')
    }
    if (!textarea) {
      const rootEl = documentTextArea.value.$el || documentTextArea.value
      if (rootEl?.tagName === 'TEXTAREA') {
        textarea = rootEl
      } else if (rootEl?.querySelector) {
        textarea = rootEl.querySelector('textarea')
      }
    }
  }
  
  if (!textarea && contentContainer.value) {
    textarea = contentContainer.value.querySelector('textarea')
  }
  
  if (!textarea) return false
  
  const start = textarea.selectionStart || 0
  const end = textarea.selectionEnd || 0
  
  switch (format) {
    case 'bold':
      const selectedText = editingContent.value.substring(start, end)
      return selectedText.startsWith('**') && selectedText.endsWith('**')
    case 'italic':
      const selectedTextItalic = editingContent.value.substring(start, end)
      return selectedTextItalic.startsWith('*') && selectedTextItalic.endsWith('*') && !selectedTextItalic.startsWith('**')
    case 'h1':
      const lineStart = editingContent.value.lastIndexOf('\n', start - 1) + 1
      const lineEnd = editingContent.value.indexOf('\n', start)
      const currentLine = editingContent.value.substring(lineStart, lineEnd === -1 ? editingContent.value.length : lineEnd)
      return currentLine.startsWith('# ')
    case 'h2':
      const lineStart2 = editingContent.value.lastIndexOf('\n', start - 1) + 1
      const lineEnd2 = editingContent.value.indexOf('\n', start)
      const currentLine2 = editingContent.value.substring(lineStart2, lineEnd2 === -1 ? editingContent.value.length : lineEnd2)
      return currentLine2.startsWith('## ')
    case 'h3':
      const lineStart3 = editingContent.value.lastIndexOf('\n', start - 1) + 1
      const lineEnd3 = editingContent.value.indexOf('\n', start)
      const currentLine3 = editingContent.value.substring(lineStart3, lineEnd3 === -1 ? editingContent.value.length : lineEnd3)
      return currentLine3.startsWith('### ')
    default:
      return false
  }
}

const handleKeyDown = (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    saveContent()
  }
}

const formatText = (text) => {
  return text.replace(/\n/g, '<br>')
}

// PDF helpers
const pdfPreviewSrc = computed(() => {
  const url = props.item?.fileDataUrl || props.item?.fileUrl || ''
  if (!url) return ''
  if (url.startsWith('blob:') || url.startsWith('data:')) return url
  const params = '#toolbar=1&navpanes=0&view=FitH&zoom=page-fit'
  return url.includes('#') ? url : `${url}${params}`
})

const downloadPDF = () => {
  const url = props.item?.fileDataUrl || props.item?.fileUrl
  if (!url) return
  const a = document.createElement('a')
  a.href = url
  a.download = props.item?.filename || 'document.pdf'
  a.click()
}

const formatFileSize = (bytes) => {
  if (!bytes) return ''
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getVerdictIcon = (verdict) => {
  const icons = {
    true: '✅',
    false: '❌',
    mixed: '⚠️',
    uncertain: '❓',
    likely_true: '✅',
    likely_false: '❌'
  }
  return icons[verdict] || '❓'
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

const getProxiedUrl = (url) => {
  if (!url) return ''
  
  // Ensure URL has proper protocol
  let cleanUrl = url.trim()
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = 'https://' + cleanUrl
  }
  
  try {
    const urlObj = new URL(cleanUrl)
    return cleanUrl
  } catch (error) {
    console.warn('Invalid URL:', url)
    return ''
  }
}

const handleIframeError = (event) => {
  console.warn('Iframe failed to load:', props.item.url)
  // Could show a fallback message or image here
}

const getUrlHostname = (url) => {
  try {
    return new URL(url).hostname
  } catch (error) {
    return url || 'Unknown source'
  }
}

const toggleSourcesCollapsed = () => {
  isSourcesCollapsed.value = !isSourcesCollapsed.value
}

const formatMarkdown = (text) => {
  if (!text) return ''
  
  try {
    // Configure marked options
    marked.setOptions({
      breaks: true,
      gfm: true,
      sanitize: false,
      smartypants: true
    })
    
    return marked(text)
  } catch (error) {
    console.warn('Markdown parsing failed, falling back to basic formatting:', error)
    // Fallback to basic formatting
    return text.replace(/\n/g, '<br>')
  }
}
</script>

<style scoped>
.canvas-item-preview {
  height: 100%;
  display: flex;
  flex-direction: column;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
}

.no-selection {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}

.no-selection-content {
  text-align: center;
  color: #999;
}

.preview-icon {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.no-selection-content h3 {
  margin: 0 0 12px 0;
  font-size: 18px;
  color: #666;
}

.no-selection-content p {
  margin: 0;
  font-size: 14px;
}

.preview-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e9ecef;
  background: #fafafa;
  flex-shrink: 0;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-info h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.type-badge {
  background: #f0f0f0;
  color: #666;
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 11px;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}


.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
}

.preview-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  height: 100%;
  max-height: none;
  min-height: 0;
}

/* Research Styles - Full ResearchResults.vue Integration */
.full-research-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.full-research-report {
  height: 100%;
  display: flex;
  flex-direction: column;
  font-family: 'DM Sans', 'LXGW WenKai', serif;
  background: #ffffff;
  overflow-y: auto;
}

/* Research Header */
.research-header {
  margin-bottom: 24px;
  text-align: center;
  padding: 20px 0;
  border-bottom: 1px solid #e8e8e8;
  flex-shrink: 0;
}

.research-title {
  font-family: 'Playfair Display', serif;
  font-size: 24px;
  font-weight: 700;
  color: #000000;
  margin: 0 0 8px 0;
}

.research-info {
  display: flex;
  justify-content: center;
  gap: 16px;
  align-items: center;
  font-size: 14px;
  color: #666666;
}

.research-mode {
  background: #f0f0f0;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #000000;
}

.research-date {
  color: #888888;
}

.research-content-section {
  flex: 1;
  margin-bottom: 24px;
  overflow-y: auto;
  padding: 0 20px;
}

.markdown-content {
  font-size: 16px;
  line-height: 1.8;
  color: #333333;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.markdown-content :deep(h1) {
  font-size: 32px;
  font-weight: 700;
  color: #000000;
  margin: 32px 0 16px 0;
  border-bottom: 2px solid #e8e8e8;
  padding-bottom: 8px;
}

.markdown-content :deep(h2) {
  font-size: 24px;
  font-weight: 600;
  color: #000000;
  margin: 28px 0 12px 0;
  text-align: center;
}

.markdown-content :deep(h3) {
  font-size: 20px;
  font-weight: 600;
  color: #000000;
  margin: 24px 0 8px 0;
  text-align: center;
}

.markdown-content :deep(p) {
  margin: 16px 0;
  text-align: justify;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 16px 0;
  padding-left: 24px;
}

.markdown-content :deep(li) {
  margin: 8px 0;
  text-align: justify;
}

.markdown-content :deep(a) {
  color: #0066cc;
  text-decoration: underline;
}

.markdown-content :deep(a:hover) {
  color: #0052a3;
}

/* Sources Section - Matching ResearchResults.vue */
.sources-section {
  margin-bottom: 24px;
  background: #fafafa;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease-out;
  flex-shrink: 0;
}

.sources-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease-out;
  border-bottom: 1px solid transparent;
}

.sources-header:hover {
  background: rgba(0, 0, 0, 0.04);
}

.sources-header.collapsed {
  border-bottom-color: transparent;
}

.sources-header .section-title {
  margin: 0;
  border: none;
  padding: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 600;
  color: #000000;
}

.sources-count {
  font-size: 16px;
  font-weight: 500;
  color: #666666;
}

.collapse-indicator {
  color: #999999;
  transition: transform 0.3s ease, color 0.2s ease-out;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
}

.collapse-indicator.collapsed {
  transform: rotate(-90deg);
}

.sources-header:hover .collapse-indicator {
  color: #1890ff;
}

.sources-content {
  display: grid;
  grid-template-rows: 1fr;
  overflow: hidden;
  transition: grid-template-rows 0.25s ease;
  border-top: 1px solid #e9ecef;
}

.sources-content.collapsed {
  grid-template-rows: 0fr;
  border-top-color: transparent;
}

.sources-inner {
  padding: 20px;
  min-height: 0;
  opacity: 1;
  filter: blur(0);
  transition: padding 0.2s ease, opacity 0.2s ease, filter 0.2s ease;
}

.sources-content.collapsed .sources-inner {
  padding-top: 0;
  padding-bottom: 0;
  opacity: 0;
  filter: blur(4px);
}

.sources-grid {
  display: grid;
  gap: 16px;
}

.source-card {
  background: #ffffff;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #e8e8e8;
  transition: all 0.2s ease;
}

.source-card:hover {
  background: #f5f5f5;
  border-color: #d0d0d0;
}

.source-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.source-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  text-align: center;
}

.source-title a {
  color: #000000;
  text-decoration: none;
}

.source-title a:hover {
  color: #0066cc;
  text-decoration: underline;
}

.source-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: #666666;
}

.source-publisher {
  font-weight: 600;
}

.source-relevance {
  font-size: 12px;
  color: #888888;
}

.source-description {
  font-size: 14px;
  color: #666;
  line-height: 1.4;
  text-align: justify;
  margin-top: 8px;
}

/* Limitations and Recommendations Sections - From ResearchResults.vue */
.limitations-section {
  margin-bottom: 24px;
  padding: 0 20px;
  flex-shrink: 0;
}

.recommendations-section {
  margin-bottom: 24px;
  padding: 0 20px;
  flex-shrink: 0;
}

.section-title {
  font-family: 'Playfair Display', serif;
  font-size: 20px;
  font-weight: 600;
  color: #000000;
  margin: 0 0 16px 0;
  border-bottom: 1px solid #e8e8e8;
  padding-bottom: 8px;
}

.limitations-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.limitations-list li {
  background: #fff8dc;
  border: 1px solid #f0e68c;
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 8px;
  font-family: 'DM Sans', 'LXGW WenKai', serif;
  font-size: 14px;
  color: #666666;
  position: relative;
  padding-left: 40px;
}

.limitations-list li::before {
  content: "⚠️";
  position: absolute;
  left: 16px;
  top: 12px;
}

.recommendations-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.recommendations-list li {
  background: #e6f7ff;
  border: 1px solid #91d5ff;
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 8px;
  font-family: 'DM Sans', 'LXGW WenKai', serif;
  font-size: 14px;
  color: #666666;
  position: relative;
  padding-left: 40px;
}

.recommendations-list li::before {
  content: "💡";
  position: absolute;
  left: 16px;
  top: 12px;
}

.result-count {
  font-size: 13px;
  color: #666;
  font-weight: 600;
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

.results-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-item {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 3px solid #e9ecef;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.result-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  line-height: 1.3;
}

.result-relevance {
  background: #e6f4ff;
  color: #1890ff;
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 600;
  flex-shrink: 0;
}

.result-snippet {
  color: #666;
  line-height: 1.5;
  margin: 0 0 8px 0;
  font-size: 13px;
}

.result-source a {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #1890ff;
  text-decoration: none;
  font-size: 12px;
}

.result-source a:hover {
  text-decoration: underline;
}

/* Fact Check Styles */
.verdict-display {
  margin-bottom: 20px;
  text-align: center;
}

.verdict-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
}

.verdict-badge.true,
.verdict-badge.likely_true {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  color: #52c41a;
}

.verdict-badge.false,
.verdict-badge.likely_false {
  background: #fff2f0;
  border: 1px solid #ffb3b3;
  color: #ff4d4f;
}

.verdict-badge.mixed,
.verdict-badge.uncertain {
  background: #fffbe6;
  border: 1px solid #ffe58f;
  color: #fa8c16;
}

.verdict-icon {
  font-size: 16px;
}

.confidence-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 300px;
  margin: 0 auto;
  padding: 8px 0;
}

.confidence-fill {
  height: 8px;
  background: linear-gradient(90deg, #ff4d4f 0%, #fa8c16 50%, #52c41a 100%);
  border-radius: 4px;
  flex: 1;
  position: relative;
  overflow: hidden;
}

.confidence-text {
  font-size: 14px;
  color: #333;
  font-weight: 600;
  min-width: 60px;
}

.claim-display,
.analysis-display {
  margin-bottom: 20px;
}

.claim-display h4,
.analysis-display h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #333;
  font-weight: 600;
}

.claim-display blockquote {
  background: #f0f7ff;
  border-left: 4px solid #1890ff;
  padding: 20px;
  margin: 0;
  font-style: italic;
  border-radius: 0 8px 8px 0;
  font-size: 16px;
  line-height: 1.6;
  font-family: 'DM Sans', 'LXGW WenKai', serif;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.analysis-text {
  line-height: 1.6;
  color: #333;
  font-size: 16px;
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid #1890ff;
  font-family: 'DM Sans', 'LXGW WenKai', serif;
  word-wrap: break-word;
  overflow-wrap: break-word;
  margin-bottom: 20px;
}

/* Evidence/Sources Display */
.evidence-display {
  margin-top: 24px;
}

.evidence-display h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #333;
  font-weight: 600;
}

.evidence-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.evidence-item {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 3px solid #52c41a;
}

.evidence-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 6px;
}

.evidence-snippet {
  font-size: 13px;
  color: #666;
  line-height: 1.4;
  margin-bottom: 8px;
}

.evidence-source a {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #1890ff;
  text-decoration: none;
  font-size: 12px;
}

.evidence-source a:hover {
  text-decoration: underline;
}

/* Document Styles */
.rich-text-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-bottom: none;
  border-radius: 8px 8px 0 0;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-group .ant-btn {
  height: 28px;
  padding: 0 8px;
  font-weight: 600;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.toolbar-group .ant-btn.active {
  background: #1890ff;
  border-color: #1890ff;
  color: white;
}

.toolbar-group .ant-btn:hover {
  background: #e6f4ff;
  border-color: #91caff;
  color: #1890ff;
}

.toolbar-group .ant-btn.active:hover {
  background: #096dd9;
  border-color: #096dd9;
}

.auto-save-indicator {
  font-size: 12px;
  color: #666;
  font-style: italic;
  transition: color 0.2s ease;
}

.auto-save-indicator.saving {
  color: #1890ff;
}

.auto-save-indicator.saved {
  color: #52c41a;
}

.document-textarea {
  font-size: 16px;
  line-height: 1.6;
  font-family: 'DM Sans', 'LXGW WenKai', serif;
  border: 1px solid #e9ecef;
  border-top: none;
  background: #ffffff;
  resize: none;
  width: 100%;
  height: calc(100vh - 200px);
  min-height: 500px;
  padding: 20px;
  border-radius: 0 0 8px 8px;
}

.document-textarea:focus {
  box-shadow: none;
  border-color: transparent;
}

.document-content {
  font-size: 16px;
  line-height: 1.6;
  color: #333;
  font-family: 'DM Sans', 'LXGW WenKai', serif;
  word-wrap: break-word;
  overflow-wrap: break-word;
  padding: 30px;
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  min-height: 500px;
  max-height: calc(100vh - 300px);
  overflow-y: auto;
}

.document-content :deep(h1) {
  font-size: 28px;
  font-weight: 700;
  color: #000;
  margin: 24px 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #e9ecef;
}

.document-content :deep(h2) {
  font-size: 24px;
  font-weight: 600;
  color: #000;
  margin: 20px 0 12px 0;
}

.document-content :deep(h3) {
  font-size: 20px;
  font-weight: 600;
  color: #000;
  margin: 16px 0 8px 0;
}

.document-content :deep(p) {
  margin: 12px 0;
  text-align: justify;
}

.document-content :deep(strong) {
  font-weight: 700;
  color: #000;
}

.document-content :deep(em) {
  font-style: italic;
  color: #333;
}

.document-content :deep(ul),
.document-content :deep(ol) {
  margin: 12px 0;
  padding-left: 20px;
}

.document-content :deep(li) {
  margin: 6px 0;
}

.document-content :deep(blockquote) {
  border-left: 4px solid #1890ff;
  padding: 16px 20px;
  margin: 16px 0;
  background: #f0f7ff;
  border-radius: 0 4px 4px 0;
}

.document-content :deep(code) {
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
}

.document-content :deep(pre) {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 16px 0;
}

.document-content :deep(pre code) {
  background: none;
  padding: 0;
}

/* Webpage Styles */
.webpage-container {
  height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
}

.url-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
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
  display: flex;
  align-items: center;
  gap: 4px;
}

.webpage-iframe {
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: calc(100vh - 200px);
  border: none;
  background: #fff;
}

/* Placeholder Styles */
.placeholder-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 20px;
  color: #999;
  min-height: 200px;
}

.placeholder-preview h4 {
  margin: 16px 0 8px 0;
  font-size: 16px;
  color: #666;
}

.placeholder-preview p {
  margin: 0 0 20px 0;
  font-size: 14px;
  line-height: 1.5;
}

/* Scrollbar Styling */
.preview-content::-webkit-scrollbar {
  width: 6px;
}

.preview-content::-webkit-scrollbar-track {
  background: #f8f9fa;
}

.preview-content::-webkit-scrollbar-thumb {
  background: #d0d0d0;
  border-radius: 3px;
}

.preview-content::-webkit-scrollbar-thumb:hover {
  background: #bbb;
}

/* PDF preview styles */
.pdf-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.pdf-preview .pdf-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.pdf-preview .pdf-bar .spacer { flex: 1; }

.pdf-preview .pdf-iframe-full {
  flex: 1;
  width: 100%;
  border: none;
  background: #fff;
}
</style>