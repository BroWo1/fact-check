<template>
  <div class="research-results" v-if="results">
    <div class="research-header">
      <h2 class="research-title">{{ t('research.title') }}</h2>
      <div class="research-info">
        <span class="research-mode">{{ t('research.mode') }}</span>
        <span class="research-date">{{ formatDate(results.created_at) }}</span>
      </div>
      <div class="research-actions">
        <button class="action-button" @click="openPPTGenerator" :disabled="!effectiveSessionId">
          📄 Generate PPT
        </button>
        <button class="action-button" @click="downloadReport">
          📄 {{ t('research.download') }}
        </button>
      </div>
    </div>

    <div class="research-content" :class="{ 'editing-mode': showInlineEdit }">
      <div class="markdown-content" v-html="renderedMarkdown"></div>
    </div>

    <!-- Sources section - NOW COLLAPSIBLE -->
    <div class="sources-section" v-if="deduplicatedSources && deduplicatedSources.length > 0" id="sources-section">
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Limitations section if available -->
    <div class="limitations-section" v-if="results.limitations && results.limitations.length > 0">
      <h3 class="section-title">{{ t('research.limitations') }}</h3>
      <ul class="limitations-list">
        <li v-for="(limitation, index) in results.limitations" :key="index">
          {{ limitation }}
        </li>
      </ul>
    </div>

    <!-- Recommendations section if available -->
    <div class="recommendations-section" v-if="results.recommendations && results.recommendations.length > 0">
      <h3 class="section-title">{{ t('research.recommendations') }}</h3>
      <ul class="recommendations-list">
        <li v-for="(recommendation, index) in results.recommendations" :key="index">
          {{ recommendation }}
        </li>
      </ul>
    </div>
  </div>

  <!-- Inline edit component - will be dynamically positioned -->
  <Teleport :to="teleportTarget" :disabled="!teleportTarget">
    <SectionEditInline
      ref="inlineEditRef"
      :visible="showInlineEdit"
      :sectionData="selectedSection"
      @close="closeInlineEdit"
      @submit-edit="handleSectionEdit"
    />
  </Teleport>

  <!-- Add the edit modal component (fallback) -->
  <SectionEditModal
    ref="editModalRef"
    :visible="showEditModal"
    :sectionData="selectedSection"
    :targetElement="selectedElement"
    @close="closeEditModal"
    @submit-edit="handleSectionEdit"
  />
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { marked } from 'marked'
import { notification } from 'ant-design-vue'
import { useCitationDeduplicator } from '../composables/useCitationDeduplicator'
import SectionEditModal from './SectionEditModal.vue'
import SectionEditInline from './SectionEditInline.vue'
import factCheckService from '../services/factCheckService'
import pdfService from '../services/pdfService'
import { SquarePen } from 'lucide-vue-next'

const { t } = useI18n()

const props = defineProps({
  results: {
    type: Object,
    required: true
  },
  originalClaim: {
    type: String,
    default: ''
  },
  sessionId: {
    type: String,
    default: ''
  },
  analysisSummary: {
    type: String,
    default: null
  }
})

// Get the effective sessionId - use prop or fallback to results.session_id
const effectiveSessionId = computed(() => {
  const propSessionId = props.sessionId && props.sessionId.trim() !== '' ? props.sessionId : null
  const resultsSessionId = props.results?.session_id || null

  const effective = propSessionId || resultsSessionId
  console.log('🔍 Effective sessionId calculation:', {
    propSessionId,
    resultsSessionId,
    effective
  })

  return effective
})

const emit = defineEmits(['headings-extracted', 'section-updated', 'open-ppt-generator'])

const isSourcesCollapsed = ref(true) // Start collapsed by default
const showEditModal = ref(false)
const showInlineEdit = ref(false)
const selectedSection = ref({})
const selectedElement = ref(null)
const editModalRef = ref(null)
const inlineEditRef = ref(null)
const editingSection = ref(null) // Track which section is being edited for shading
const teleportTarget = ref(null) // Target element for teleporting the modal

// Initialize deduplicator once for the entire component
const deduplicator = useCitationDeduplicator()

// Toggle sources collapsed state
const toggleSourcesCollapsed = () => {
  isSourcesCollapsed.value = !isSourcesCollapsed.value
}

// NEW: Computed property to deduplicate sources
const deduplicatedSources = computed(() => {
  if (!props.results.sources || !Array.isArray(props.results.sources)) {
    return []
  }

  const seenUrls = new Set()
  const uniqueSources = []

  for (const source of props.results.sources) {
    if (source.url && !seenUrls.has(source.url)) {
      seenUrls.add(source.url)
      uniqueSources.push(source)
    }
  }

  return uniqueSources
})

const renderedMarkdown = computed(() => {
  if (!props.results.summary) return ''

  // Debug sessionId availability
  console.log('ResearchResults - renderedMarkdown computed:', {
    propSessionId: props.sessionId,
    resultsSessionId: props.results?.session_id,
    effectiveSessionId: effectiveSessionId.value
  })
  console.log('ResearchResults - props.results:', props.results)

  // Reset deduplicator for fresh calculation
  deduplicator.reset()

  // Configure marked options
  marked.setOptions({
    breaks: true,
    gfm: true,
    sanitize: false,
    smartypants: true
  })

  const htmlContent = addIdsToHeadings(removeDuplicateCitations(marked(props.results.summary)))

  // Make this computed reactive to sessionId changes
  void effectiveSessionId.value

  // Extract headings and emit to parent
  nextTick(() => {
    extractAndEmitHeadings(htmlContent)
    setupEditHandlers()
  })

  return htmlContent
})

// NEW: Add unique IDs to headings for TOC navigation
const addIdsToHeadings = (htmlContent) => {
  if (!htmlContent) return ''

  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = htmlContent

  const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6')

  // Check if sessionId is available for edit functionality
  const hasSessionId = effectiveSessionId.value !== null

  headings.forEach((heading, index) => {
    const text = heading.textContent.trim()
    const id = `heading-${index}-${text.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}`
    heading.id = id
    heading.style.scrollMarginTop = '80px'

    // Add edit functionality to H2 headings - always show for visual consistency
    if (heading.tagName === 'H2') {
      heading.style.position = 'relative'
      heading.style.cursor = 'pointer'
      heading.classList.add('editable-heading')
      // Add data attribute to indicate if actually editable
      heading.dataset.hasSessionId = hasSessionId ? 'true' : 'false'
    }
  })

  return tempDiv.innerHTML
}

// Add click handlers to headings after DOM is updated
const setupEditHandlers = () => {
  nextTick(() => {
    const editableHeadings = document.querySelectorAll('.markdown-content h2.editable-heading')

    editableHeadings.forEach((heading) => {
      if (!heading.dataset.hasHandler) {
        heading.dataset.hasHandler = 'true'

        // Add edit icon right after the title text
        let editIcon = heading.querySelector('.edit-icon')
        if (!editIcon) {
          editIcon = document.createElement('span')
          editIcon.innerHTML = ''
          const penIcon = document.createElement('span')
          penIcon.innerHTML = ''
          const penSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
          penSvg.setAttribute('width', '14')
          penSvg.setAttribute('height', '14')
          penSvg.setAttribute('viewBox', '0 0 24 24')
          penSvg.setAttribute('fill', 'none')
          penSvg.setAttribute('stroke', 'currentColor')
          penSvg.setAttribute('stroke-width', '2')
          penSvg.setAttribute('stroke-linecap', 'round')
          penSvg.setAttribute('stroke-linejoin', 'round')
          penSvg.innerHTML = '<path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/>'
          const textSpan = document.createElement('span')
          textSpan.textContent = ' Edit'
          editIcon.appendChild(penSvg)
          editIcon.appendChild(textSpan)
          editIcon.className = 'edit-icon'
          heading.appendChild(editIcon)
        }

        // Update icon appearance based on sessionId availability
        const hasSessionId = effectiveSessionId.value !== null
        if (hasSessionId) {
          editIcon.style.opacity = '0.6'
          editIcon.style.filter = 'none'
        } else {
          editIcon.style.opacity = '0.3'
          editIcon.style.filter = 'grayscale(100%)'
        }

        // Click handler on the entire heading
        heading.addEventListener('click', (event) => {
          event.preventDefault()
          const text = heading.textContent.replace(' Edit', '').trim()
          const id = heading.id

          // Check if modal is already open for this section
          if (showInlineEdit.value && editingSection.value === id) {
            // Close the modal if clicking the same heading
            closeInlineEdit()
            return
          }

          // Debug logging
          console.log('H2 heading clicked:', text)
          console.log('SessionId at click time:', props.sessionId)
          console.log('Props object:', props)

          // Check if sessionId is available at click time
          if (!effectiveSessionId.value) {
            console.error('SessionId validation failed:', {
              propSessionId: props.sessionId,
              resultsSessionId: props.results?.session_id,
              effectiveSessionId: effectiveSessionId.value
            })
            notification.warning({
              message: t('research.editFailed'),
              description: 'Session ID is not available. Please refresh the page and try again.',
              duration: 4
            })
            return
          }

          openInlineEditComponent(heading, text, id)
        })

        // Hover effects for entire heading
        heading.addEventListener('mouseenter', () => {
          const hasSessionIdNow = effectiveSessionId.value !== null

          heading.style.background = '#f2f2f2'
          heading.style.borderRadius = '4px'
          heading.style.padding = '4px 8px'

          if (editIcon) {
            if (hasSessionIdNow) {
              editIcon.style.opacity = '1'
              editIcon.style.transform = 'scale(1.2) translateY(-2px)'
              editIcon.style.filter = 'none'
            } else {
              editIcon.style.opacity = '0.5'
              editIcon.style.transform = 'scale(1.1) translateY(-1px)'
              editIcon.style.filter = 'grayscale(100%)'
            }
          }
        })

        heading.addEventListener('mouseleave', () => {
          const hasSessionIdNow = effectiveSessionId.value !== null

          heading.style.background = 'none'
          heading.style.padding = '0'

          if (editIcon) {
            if (hasSessionIdNow) {
              editIcon.style.opacity = '0.6'
              editIcon.style.filter = 'none'
            } else {
              editIcon.style.opacity = '0.3'
              editIcon.style.filter = 'grayscale(100%)'
            }
            editIcon.style.transform = 'scale(1) translateY(0)'
          }
        })
      }
    })
  })
}

// NEW: Extract headings and emit to parent component
const extractAndEmitHeadings = (htmlContent) => {
  if (!htmlContent) return

  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = htmlContent

  const headings = []
  const h2AndH3Elements = tempDiv.querySelectorAll('h2, h3')

  h2AndH3Elements.forEach((heading) => {
    const level = parseInt(heading.tagName.charAt(1))
    // Remove edit icon from text for table of contents
    const text = heading.textContent.replace(' Edit', '').trim()
    const id = heading.id

    if (text && id) {
      headings.push({
        id,
        text,
        level,
        isSource: false
      })
    }
  })

  // Add sources section if it exists
  if (deduplicatedSources.value && deduplicatedSources.value.length > 0) {
    headings.push({
      id: 'sources-section',
      text: `${t('research.sources')} (${deduplicatedSources.value.length})`,
      level: 2,
      isSource: true
    })
  }

  emit('headings-extracted', headings)
}

// Get deduplicated text content for copying/downloading
const deduplicatedTextContent = computed(() => {
  if (!props.results.summary) return ''

  // Reset deduplicator for fresh calculation
  deduplicator.reset()

  // Remove duplicate citations from the markdown text before processing
  return removeDuplicateTextCitations(props.results.summary)
})

// Function to remove duplicate citations from markdown content
const removeDuplicateCitations = (htmlContent) => {
  if (!htmlContent) return ''

  // Don't reset here - use the shared deduplicator instance

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

// Function to remove duplicate citations from text content
const removeDuplicateTextCitations = (textContent) => {
  if (!textContent) return ''

  // Don't reset here - use the shared deduplicator instance

  // Pattern to match markdown links: [title](url)
  return textContent.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, title, url) => {
    // Check if this is a duplicate
    if (deduplicator.isDuplicate(url, title)) {
      // Remove the duplicate citation
      return ''
    } else {
      // Track this citation and keep it
      deduplicator.addCitation(url, title)
      return match
    }
  })
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString()
}

const openPPTGenerator = () => {
  if (!effectiveSessionId.value) {
    notification.warning({
      message: 'Session Required',
      description: 'A session ID is required to access the PPT generator. Please ensure your analysis is complete.',
      duration: 4
    })
    return
  }
  
  // Emit event to parent component to open/expand the PPT generator side section
  emit('open-ppt-generator')
}

const downloadReport = () => {
  try {
    // Prepare data for PDF generation
    const reportData = {
      originalClaim: props.originalClaim,
      created_at: props.results.created_at,
      summary: deduplicatedTextContent.value || 'No summary available',
      sources: deduplicatedSources.value || [],
      limitations: props.results.limitations || [],
      recommendations: props.results.recommendations || [],
      mode: 'Research Mode',
      // Use analysis summary as the title if available
      analysisTitle: props.analysisSummary
    }

    // Generate and download PDF
    pdfService.createPDF(reportData)
    
    // Use analysis summary for filename if available, otherwise use date
    const baseFilename = props.analysisSummary 
      ? props.analysisSummary.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').toLowerCase().substring(0, 50)
      : 'research-report'
    const filename = `${baseFilename}-${new Date().toISOString().split('T')[0]}.pdf`
    pdfService.downloadPDF(filename)

    notification.success({
      message: 'PDF Download Started',
      description: 'Your research report PDF with table of contents is being downloaded.',
      duration: 3
    })
  } catch (error) {
    console.error('PDF generation failed:', error)
    notification.error({
      message: 'PDF Generation Failed',
      description: 'Failed to generate PDF. Please try again or contact support.',
      duration: 4
    })
  }
}

// Extract section content based on heading
const extractSectionContent = (headingId, htmlContent) => {
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = htmlContent

  const heading = tempDiv.querySelector(`#${headingId}`)
  if (!heading) return ''

  let content = ''
  let currentElement = heading.nextElementSibling

  // Collect content until next heading of same or higher level
  while (currentElement) {
    const tagName = currentElement.tagName
    if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(tagName)) {
      const currentLevel = parseInt(tagName.charAt(1))
      const headingLevel = parseInt(heading.tagName.charAt(1))
      if (currentLevel <= headingLevel) break
    }
    content += currentElement.outerHTML
    currentElement = currentElement.nextElementSibling
  }

  return content
}

// Extract original markdown section
const extractMarkdownSection = (headingText, originalMarkdown) => {
  console.log('Extracting markdown section for:', headingText)
  console.log('Heading text encoding info:', {
    length: headingText.length,
    charCodes: Array.from(headingText).map(char => char.charCodeAt(0)),
    containsChinese: /[\u4e00-\u9fff]/.test(headingText)
  })

  if (!originalMarkdown) {
    console.warn('No original markdown provided')
    return ''
  }

  const lines = originalMarkdown.split('\n')
  let sectionStart = -1
  let sectionEnd = lines.length

  // Find the section start
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) {
      const lineHeading = lines[i].substring(3).trim()
      console.log(`Comparing line ${i}: "${lineHeading}" vs target: "${headingText}"`)
      console.log('Line heading encoding:', {
        length: lineHeading.length,
        charCodes: Array.from(lineHeading).map(char => char.charCodeAt(0)),
        containsChinese: /[\u4e00-\u9fff]/.test(lineHeading)
      })
      
      if (lineHeading === headingText || lines[i].includes(headingText)) {
        sectionStart = i
        console.log('Found section start at line:', i, lines[i])
        break
      }
    }
  }

  if (sectionStart === -1) {
    console.warn('Section not found in markdown:', headingText)
    console.warn('Available headings:')
    lines.forEach((line, i) => {
      if (line.startsWith('## ')) {
        console.warn(`  Line ${i}: "${line.substring(3).trim()}"`)
      }
    })
    return ''
  }

  // Find the section end (next ## heading)
  for (let i = sectionStart + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) {
      sectionEnd = i
      console.log('Found section end at line:', i)
      break
    }
  }

  const sectionMarkdown = lines.slice(sectionStart, sectionEnd).join('\n')
  console.log('Extracted section markdown length:', sectionMarkdown.length)

  return sectionMarkdown
}

// Open inline edit component for a section
const openInlineEditComponent = (element, headingText, headingId) => {
  console.log('Opening inline edit for section:', headingText, 'with ID:', headingId)

  // If another inline edit is already open, close it first
  if (showInlineEdit.value) {
    closeInlineEdit()
    // Wait for the close animation to complete before opening new one
    setTimeout(() => {
      openInlineEditInternal(element, headingText, headingId)
    }, 250) // Match the close animation duration
  } else {
    openInlineEditInternal(element, headingText, headingId)
  }
}

// Internal function to handle the actual opening logic
const openInlineEditInternal = (element, headingText, headingId) => {
  const htmlContent = renderedMarkdown.value
  const sectionContent = extractSectionContent(headingId, htmlContent)
  const originalMarkdown = extractMarkdownSection(headingText, props.results.summary)

  console.log('Section data prepared:', {
    id: headingId,
    title: headingText,
    contentLength: sectionContent.length,
    markdownLength: originalMarkdown.length
  })

  // Validate that we have content before proceeding
  if (!originalMarkdown || originalMarkdown.trim() === '') {
    console.error('Failed to extract markdown section for:', headingText)
    console.error('Available headings in markdown:', props.results.summary.split('\n').filter(line => line.startsWith('## ')))
    notification.error({
      message: 'Section Not Found',
      description: 'Could not locate the section content for editing. Please try refreshing the page.',
      duration: 4
    })
    return
  }

  selectedSection.value = {
    id: headingId,
    title: headingText,
    content: sectionContent,
    originalMarkdown: originalMarkdown
  }

  selectedElement.value = element
  editingSection.value = headingId

  // Create a container element right after the clicked heading
  createTeleportContainer(element)

  showInlineEdit.value = true

  // Highlight the entire section content after modal is positioned
  nextTick(() => {
    // Wait a bit more for the teleport and animations to settle
    setTimeout(() => {
      highlightSectionContent(element)
    }, 250)
  })
}

// Create a teleport container after the clicked heading
const createTeleportContainer = (headingElement) => {
  // Remove any existing teleport container
  removeTeleportContainer()

  // Create a new container element
  const container = document.createElement('div')
  container.id = 'inline-edit-teleport-target'
  container.style.width = '100%'

  // Insert the container right after the heading
  headingElement.parentNode.insertBefore(container, headingElement.nextSibling)

  // Set as teleport target
  teleportTarget.value = '#inline-edit-teleport-target'
}

// Remove the teleport container
const removeTeleportContainer = () => {
  const existingContainer = document.getElementById('inline-edit-teleport-target')
  if (existingContainer) {
    existingContainer.remove()
  }
  teleportTarget.value = null
}

// Handle section edit submission
const handleSectionEdit = async (editData) => {
  // Validate sessionId before making API call
  if (!effectiveSessionId.value) {
    console.error('Session ID is missing or empty for edit request')
    notification.error({
      message: t('research.editFailed'),
      description: 'Session ID is missing. Please refresh the page and try again.',
      duration: 4
    })
    throw new Error('Session ID is missing or empty')
  }

  // Don't await this - handle it in background while modal shows progress
  handleEditAsync(editData)
}

// Async handler that doesn't block the modal
const handleEditAsync = async (editData) => {
  try {
    console.log('Making edit request with sessionId:', effectiveSessionId.value)

    // Define status update callback
    const onStatusUpdate = (status, attempt, maxAttempts) => {
      console.log(`Edit status: ${status} (${attempt}/${maxAttempts})`)

      // Update the modal loading stage based on status
      if (inlineEditRef.value) {
        if (status === 'polling' || status === 'processing') {
          inlineEditRef.value.updateLoadingStage('polling', attempt, maxAttempts)
        }
      }
    }

    const requestData = {
      ...editData,
      fullReport: props.results.summary
    }
    
    console.log('API Request data check:', {
      sectionTitle: requestData.sectionTitle,
      sectionTitleLength: requestData.sectionTitle?.length,
      sectionTitleHasChinese: /[\u4e00-\u9fff]/.test(requestData.sectionTitle || ''),
      originalContentLength: requestData.originalContent?.length,
      originalContentHasChinese: /[\u4e00-\u9fff]/.test(requestData.originalContent || ''),
      editPromptLength: requestData.editPrompt?.length,
      editPromptHasChinese: /[\u4e00-\u9fff]/.test(requestData.editPrompt || '')
    })

    const response = await factCheckService.editSection(effectiveSessionId.value, requestData, onStatusUpdate)

    console.log('Edit response received:', response)

    if (response.updated_section) {
      console.log('Updated section content:', response.updated_section)

      // Notify modal of completion
      if (inlineEditRef.value) {
        inlineEditRef.value.updateLoadingStage('completed', 0, 0)
      }

      // Update the results with the new section content
      const updatedSummary = updateSectionInMarkdown(
        props.results.summary,
        editData.sectionTitle,
        response.updated_section
      )

      console.log('Summary updated, original length:', props.results.summary.length, 'new length:', updatedSummary.length)

      // Emit the update to parent component
      emit('section-updated', {
        ...props.results,
        summary: updatedSummary
      })

      // Auto-close modal after a brief success display
      setTimeout(() => {
        closeInlineEdit()

        // Show success notification after modal closes
        notification.success({
          message: t('research.editSuccess'),
          description: t('research.editSuccessDescription'),
          duration: 4,
          placement: 'topRight'
        })

        // Smooth scroll to the updated section
        nextTick(() => {
          if (selectedElement.value) {
            selectedElement.value.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            })

            // Highlight the updated section briefly
            selectedElement.value.style.background = 'linear-gradient(135deg, #e6f7ff, #bae7ff)'
            selectedElement.value.style.transition = 'background 0.3s ease'

            setTimeout(() => {
              selectedElement.value.style.background = ''
            }, 2000)
          }
        })
      }, 1500) // Show completed state for 1.5 seconds before closing

    } else {
      console.warn('No updated_section in response:', response)

      // Reset modal state on error
      if (inlineEditRef.value) {
        inlineEditRef.value.resetModalState()
      }

      notification.warning({
        message: 'Edit completed but no content received',
        description: 'The server processed your edit but returned no updated content.',
        duration: 4
      })
    }
  } catch (error) {
    console.error('Section edit failed:', error)

    // Reset modal state on error
    if (inlineEditRef.value) {
      inlineEditRef.value.resetModalState()
    }

    // Handle error notification in modal or parent
    notification.error({
      message: t('research.editFailed'),
      description: error.message || t('research.editFailedDescription'),
      duration: 6
    })
  }
}

// Update a section in the markdown content
const updateSectionInMarkdown = (originalMarkdown, sectionTitle, newSectionContent) => {
  console.log('Updating section:', sectionTitle)
  console.log('Original markdown length:', originalMarkdown.length)
  console.log('New section content:', newSectionContent.substring(0, 200) + '...')

  const lines = originalMarkdown.split('\n')
  let sectionStart = -1
  let sectionEnd = lines.length

  // Find the section start - try different matching strategies
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.startsWith('## ')) {
      const headingText = line.substring(3).trim()
      console.log(`Checking heading "${headingText}" against "${sectionTitle}"`)

      // Try exact match first
      if (headingText === sectionTitle) {
        sectionStart = i
        console.log('Found exact match at line:', i)
        break
      }

      // Try partial match (in case of slight differences)
      if (headingText.includes(sectionTitle) || sectionTitle.includes(headingText)) {
        sectionStart = i
        console.log('Found partial match at line:', i)
        break
      }
    }
  }

  if (sectionStart === -1) {
    console.warn('Section not found:', sectionTitle)
    console.log('Available sections:')
    lines.forEach((line, i) => {
      if (line.startsWith('## ')) {
        console.log(`  Line ${i}: ${line}`)
      }
    })
    return originalMarkdown
  }

  // Find the section end (next ## heading)
  for (let i = sectionStart + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) {
      sectionEnd = i
      console.log('Found section end at line:', i)
      break
    }
  }

  console.log(`Section found: lines ${sectionStart} to ${sectionEnd}`)

  // Replace the section
  const beforeSection = lines.slice(0, sectionStart)
  const afterSection = lines.slice(sectionEnd)
  const newSection = newSectionContent.split('\n')

  const result = [...beforeSection, ...newSection, ...afterSection].join('\n')
  console.log('Updated markdown length:', result.length)

  return result
}

// Highlight the entire section content with subtle blue overlay
const highlightSectionContent = (headingElement) => {
  // Remove any existing highlights
  const existingOverlay = document.querySelector('.section-highlight-overlay')
  if (existingOverlay) {
    existingOverlay.remove()
  }

  // Find the section bounds (skip teleport container)
  let sectionEnd = null
  let currentElement = headingElement.nextElementSibling
  
  while (currentElement) {
    // Skip the teleport container
    if (currentElement.id === 'inline-edit-teleport-target') {
      currentElement = currentElement.nextElementSibling
      continue
    }
    
    const tagName = currentElement.tagName
    if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(tagName)) {
      const currentLevel = parseInt(tagName.charAt(1))
      const headingLevel = parseInt(headingElement.tagName.charAt(1))
      if (currentLevel <= headingLevel) {
        sectionEnd = currentElement
        break
      }
    }
    currentElement = currentElement.nextElementSibling
  }

  // Create overlay element
  const overlay = document.createElement('div')
  overlay.className = 'section-highlight-overlay'
  
  // Get current positions (after modal insertion)
  const headingRect = headingElement.getBoundingClientRect()
  const containerRect = headingElement.parentElement.getBoundingClientRect()
  
  // Find the actual section content start (after teleport container)
  let sectionStartElement = headingElement.nextElementSibling
  while (sectionStartElement && sectionStartElement.id === 'inline-edit-teleport-target') {
    sectionStartElement = sectionStartElement.nextElementSibling
  }
  
  let sectionStartRect
  if (sectionStartElement) {
    sectionStartRect = sectionStartElement.getBoundingClientRect()
  } else {
    sectionStartRect = headingRect
  }
  
  let endRect
  if (sectionEnd) {
    endRect = sectionEnd.getBoundingClientRect()
  } else {
    // Use parent container's bottom if no next heading
    endRect = { top: containerRect.bottom }
  }
  
  // Position overlay to cover from heading to end, but account for teleport container
  overlay.style.position = 'absolute'
  overlay.style.left = '0'
  overlay.style.right = '0'
  overlay.style.top = (sectionStartRect.top - containerRect.top) + 'px'
  overlay.style.height = (endRect.top - sectionStartRect.top) + 'px'
  overlay.style.background = 'rgba(24, 144, 255, 0.08)'
  overlay.style.borderRadius = '8px'
  overlay.style.pointerEvents = 'none'
  overlay.style.zIndex = '1'
  overlay.style.transition = 'opacity 0.3s ease'
  overlay.style.opacity = '0'
  
  // Add to parent container
  const container = headingElement.closest('.research-content')
  if (container) {
    container.style.position = 'relative'
    container.appendChild(overlay)
    
    // Fade in overlay
    requestAnimationFrame(() => {
      overlay.style.opacity = '1'
    })
  }
}


// Close inline edit component
const closeInlineEdit = () => {
  // Remove section highlighting overlay
  const existingOverlay = document.querySelector('.section-highlight-overlay')
  if (existingOverlay) {
    existingOverlay.style.opacity = '0'
    setTimeout(() => {
      existingOverlay.remove()
    }, 300)
  }

  // Start closing animation first
  showInlineEdit.value = false

  // Remove teleport container after animation completes
  setTimeout(() => {
    removeTeleportContainer()
    selectedSection.value = {}
    selectedElement.value = null
    editingSection.value = null
  }, 250) // Match SectionEditInline's leave animation duration
}

// Close edit modal (keep for fallback)
const closeEditModal = () => {
  showEditModal.value = false
  selectedSection.value = {}
  selectedElement.value = null
}

</script>

<style scoped>
.research-results {
  background: #ffffff;
  border-radius: 12px;
  padding: 32px;
  margin-top: 24px;
  border: 1px solid #e8e8e8;
  overflow-wrap: break-word; /* Ensure container handles long words */
  word-wrap: break-word; /* Legacy support */
}

.research-header {
  margin-bottom: 24px;
  text-align: center;
}

.research-title {
  font-family: 'Playfair Display', serif;
  font-size: 28px;
  font-weight: 700;
  color: #000000;
  margin: 0 0 8px 0;
}

.research-info {
  display: flex;
  justify-content: center;
  gap: 16px;
  align-items: center;
  font-family: 'DM Sans', 'LXGW WenKai', serif;
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

.research-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
}

.action-button {
  background: #ffffff;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  padding: 8px 16px;
  font-family: 'DM Sans', 'LXGW WenKai', serif;
  font-size: 14px;
  color: #000000;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.action-button:hover:not(:disabled) {
  background: #f5f5f5;
  border-color: #000000;
}

.action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.research-content {
  margin-bottom: 32px;
}

.markdown-content {
  font-family: 'DM Sans', 'LXGW WenKai', serif;
  font-size: 16px;
  line-height: 1.8;
  color: #333333;
  word-wrap: break-word; /* General word breaking for all content */
  overflow-wrap: break-word; /* Modern property for word breaking */
}

/* Markdown styling */
.markdown-content :deep(h1) {
  font-family: 'DM Sans', 'LXGW WenKai', serif;
  font-size: 32px;
  font-weight: 700;
  color: #000000;
  margin: 32px 0 16px 0;
  border-bottom: 2px solid #e8e8e8;
  padding-bottom: 8px;
  word-wrap: break-word; /* Allow long headings to break */
  overflow-wrap: break-word; /* Modern property for word breaking */
}

.markdown-content :deep(h2) {
  font-family: 'DM Sans', 'LXGW WenKai', serif;
  font-size: 24px;
  font-weight: 600;
  color: #000000;
  margin: 28px 0 12px 0;
  scroll-margin-top: 80px;
  text-align: center;
  transition: all 0.2s ease;
  word-wrap: break-word; /* Allow long headings to break */
  overflow-wrap: break-word; /* Modern property for word breaking */
}

.markdown-content :deep(h2.editable-heading) {
  position: relative;
  cursor: pointer;
  transition: all 0.2s ease;
}

.markdown-content :deep(.edit-icon) {
  font-size: 0.7em;
  opacity: 0.6;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  margin-left: 8px;
  display: inline-block;
  transform: scale(1) translateY(0);
  user-select: none;
  pointer-events: none;
}

.markdown-content :deep(h3) {
  font-family: 'DM Sans', 'LXGW WenKai', serif;
  font-size: 20px;
  font-weight: 600;
  color: #000000;
  margin: 24px 0 8px 0;
  scroll-margin-top: 80px;
  text-align: center;
  word-wrap: break-word; /* Allow long headings to break */
  overflow-wrap: break-word; /* Modern property for word breaking */
}

.markdown-content :deep(h4) {
  font-family: 'DM Sans', 'LXGW WenKai', serif;
  font-size: 18px;
  font-weight: 600;
  color: #000000;
  margin: 20px 0 8px 0;
  scroll-margin-top: 80px;
  word-wrap: break-word; /* Allow long headings to break */
  overflow-wrap: break-word; /* Modern property for word breaking */
}

.markdown-content :deep(p) {
  margin: 16px 0;
  text-align: justify;
  hyphens: auto; /* Enable automatic hyphenation */
  -webkit-hyphens: auto; /* Safari support */
  -ms-hyphens: auto; /* IE/Edge support */
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 16px 0;
  padding-left: 24px;
  margin-top: 8px;

}

.markdown-content :deep(li) {
  margin: 8px 0;
  text-align: justify;
}

.markdown-content :deep(blockquote) {
  border-left: 4px solid #e8e8e8;
  padding-left: 16px;
  margin: 16px 0;
  font-style: italic;
  color: #666666;
}

.markdown-content :deep(code) {
  background: #f5f5f5;
  padding: 2px 4px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 14px;
  word-wrap: break-word; /* Allow long code snippets to break */
  overflow-wrap: break-word; /* Modern property for word breaking */
}

.markdown-content :deep(pre) {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 16px 0;
}

.markdown-content :deep(pre code) {
  background: none;
  padding: 0;
}

.markdown-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
  overflow-x: auto;
  display: block;
  /* Remove white-space: nowrap to allow better responsive behavior */
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  border: 1px solid #e8e8e8;
  padding: 8px 12px;
  text-align: justify;
  min-width: 80px; /* Reduced from 100px to be more mobile-friendly */
  word-wrap: break-word; /* Allow long words to break */
  overflow-wrap: break-word; /* Modern property for word breaking */
}

.markdown-content :deep(th) {
  background: #f5f5f5;
  font-weight: 600;
}

.markdown-content :deep(a) {
  color: #0066cc;
  text-decoration: underline;
  word-wrap: break-word; /* Allow long URLs to break */
  overflow-wrap: break-word; /* Modern property for word breaking */
  word-break: break-all; /* Break long URLs at any character if needed */
}

.markdown-content :deep(a:hover) {
  color: #0052a3;
}

/* Handle parenthetical citations and long technical terms */
.markdown-content :deep(*) {
  /* Allow breaking at any point for very long words if needed */
  word-break: break-word;
  /* Enable hyphens for better text wrapping */
  hyphens: auto;
  -webkit-hyphens: auto;
  -ms-hyphens: auto;
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

/* Collapsible sources section styles */
.sources-section {
  margin-bottom: 24px;
  background: #fafafa;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease-out;
  scroll-margin-top: 80px;
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
}

.sources-count {
  font-size: 16px;
  font-weight: 500;
  color: #666666;
  font-family: 'DM Sans', 'LXGW WenKai', serif;
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
  font-family: 'DM Sans', 'LXGW WenKai', serif;
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
  font-family: 'DM Sans', 'LXGW WenKai', serif;
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

.limitations-section {
  margin-bottom: 24px;
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

.recommendations-section {
  margin-bottom: 24px;
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

/* Editing mode styles - subtle highlighting */
.research-content.editing-mode {
  position: relative;
}

/* Highlight just the section being edited */
.research-content.editing-mode .markdown-content h2.editable-heading {
  background: rgba(24, 144, 255, 0.05) !important;
  border-radius: 8px !important;
  padding: 8px 12px !important;
  margin: 16px 0 !important;
  border-left: 4px solid rgba(24, 144, 255, 0.4) !important;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.08) !important;
  transition: all 0.3s ease !important;
}


@media (max-width: 768px) {
  .research-results {
    padding: 20px;
    overflow-wrap: break-word !important;
    word-wrap: break-word !important;
    max-width: 90vw !important; /* Force maximum width to viewport width */
    width: 100% !important;
    box-sizing: border-box !important;
    overflow-x: hidden !important; /* Prevent horizontal scroll */
  }

  .research-title {
    font-size: 24px;
  }

  .research-info {
    flex-direction: column;
    gap: 8px;
  }

  .research-actions {
    flex-direction: column;
    gap: 8px;
  }

  .action-button {
    width: 100%;
    justify-content: center;
  }

  .research-content {
    max-width: 100% !important;
    overflow-x: hidden !important;
    box-sizing: border-box !important;
  }

  .markdown-content {
    font-size: 15px;
    /* Comprehensive mobile text handling */
    word-break: break-word !important;
    overflow-wrap: break-word !important;
    hyphens: auto !important;
    -webkit-hyphens: auto !important;
    -ms-hyphens: auto !important;
    /* Prevent any element from extending beyond container */
    max-width: calc(100vw - 40px) !important; /* Account for padding (20px * 2) */
    width: 100% !important;
    overflow-x: hidden !important;
    box-sizing: border-box !important;
  }

  .markdown-content :deep(h1) {
    font-size: 26px;
  }

  .markdown-content :deep(h2) {
    font-size: 20px;
  }

  .markdown-content :deep(h3) {
    font-size: 16px;
  }

  .markdown-content :deep(p) {
    font-size: 13px;
    margin: 13px, 0;
  }

  .sources-header {
    padding: 12px 16px;
  }

  .sources-inner {
    padding: 16px;
  }

  .source-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .markdown-content :deep(table) {
    display: block;
    overflow-x: auto;
    white-space: normal; /* Allow text wrapping in mobile tables */
    max-width: 100%;
    -webkit-overflow-scrolling: touch;
  }

  .markdown-content :deep(th),
  .markdown-content :deep(td) {
    padding: 6px 8px;
    font-size: 13px;
    min-width: 60px; /* Reduced from 80px to prevent overflow */
    white-space: normal; /* Allow text wrapping in mobile */
    word-wrap: break-word;
  }

  /* Mobile-specific aggressive word breaking */
  .markdown-content :deep(p),
  .markdown-content :deep(li),
  .markdown-content :deep(span) {
    word-break: break-word;
    overflow-wrap: break-word;
    hyphens: auto;
    -webkit-hyphens: auto;
    -ms-hyphens: auto;
    font-size: 13px;
  }

  /* Ensure parenthetical citations break properly on mobile */
  .markdown-content :deep(*) {
    word-break: break-word !important;
    overflow-wrap: break-word !important;
    max-width: 100% !important; /* Force all elements to stay within container */
    box-sizing: border-box !important;
  }

  /* Specific constraints for potentially problematic elements */
  .markdown-content :deep(table),
  .markdown-content :deep(pre),
  .markdown-content :deep(code),
  .markdown-content :deep(a),
  .markdown-content :deep(img) {
    max-width: 100% !important;
    overflow-x: auto !important;
    box-sizing: border-box !important;
  }
}
</style>

<!-- Section highlighting overlay styles -->
<style>
.section-highlight-overlay {
  position: absolute;
  background: rgba(24, 144, 255, 0.08);
  border-radius: 8px;
  pointer-events: none;
  z-index: 1;
  transition: opacity 0.3s ease;
}
</style>
