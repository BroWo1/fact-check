<template>
  <div class="research-results" v-if="results">
    <div class="research-header">
      <h2 class="research-title">{{ t('research.title') }}</h2>
      <div class="research-info">
        <span class="research-mode">{{ t('research.mode') }}</span>
        <span class="research-date">{{ formatDate(results.created_at) }}</span>
      </div>
      <div class="research-actions">
        <button class="action-button" @click="copyToClipboard" :disabled="copying">
          {{ copying ? '📋 Copying...' : '📋 ' + t('research.copy') }}
        </button>
        <button class="action-button" @click="downloadReport">
          📄 {{ t('research.download') }}
        </button>
      </div>
    </div>

    <div class="research-content">
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
</template>

<script setup>
import { computed, ref, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { marked } from 'marked'
import { notification } from 'ant-design-vue'
import { useCitationDeduplicator } from '../composables/useCitationDeduplicator'

const { t } = useI18n()

const props = defineProps({
  results: {
    type: Object,
    required: true
  },
  originalClaim: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['headings-extracted'])

const copying = ref(false)
const isSourcesCollapsed = ref(true) // Start collapsed by default

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

  // Extract headings and emit to parent
  nextTick(() => {
    extractAndEmitHeadings(htmlContent)
  })

  return htmlContent
})

// NEW: Add unique IDs to headings for TOC navigation
const addIdsToHeadings = (htmlContent) => {
  if (!htmlContent) return ''

  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = htmlContent

  const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6')

  headings.forEach((heading, index) => {
    const text = heading.textContent.trim()
    const id = `heading-${index}-${text.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}`
    heading.id = id
    heading.style.scrollMarginTop = '80px'
  })

  return tempDiv.innerHTML
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
    const text = heading.textContent.trim()
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

const copyToClipboard = async () => {
  copying.value = true
  try {
    // Create a plain text version of the research report using deduplicated content
    const plainTextReport = `
Research Report: ${props.originalClaim}
Generated: ${formatDate(props.results.created_at)}

${deduplicatedTextContent.value || 'No summary available'}

${deduplicatedSources.value && deduplicatedSources.value.length > 0 ? `
Sources:
${deduplicatedSources.value.map((source, index) => `${index + 1}. ${source.title || source.url} (${source.url})`).join('\n')}
` : ''}

${props.results.limitations && props.results.limitations.length > 0 ? `
Limitations:
${props.results.limitations.map(limitation => `• ${limitation}`).join('\n')}
` : ''}

${props.results.recommendations && props.results.recommendations.length > 0 ? `
Recommendations:
${props.results.recommendations.map(rec => `• ${rec}`).join('\n')}
` : ''}
`.trim()

    await navigator.clipboard.writeText(plainTextReport)
    notification.success({
      message: 'Report Copied',
      description: 'The research report has been copied to your clipboard.',
      duration: 3
    })
  } catch (error) {
    console.error('Failed to copy:', error)
    notification.error({
      message: 'Copy Failed',
      description: 'Failed to copy the report to clipboard. Your browser may not support this feature.',
      duration: 3
    })
  } finally {
    copying.value = false
  }
}

const downloadReport = () => {
  // Create a downloadable text file using deduplicated content
  const plainTextReport = `
Research Report: ${props.originalClaim}
Generated: ${formatDate(props.results.created_at)}

${deduplicatedTextContent.value || 'No summary available'}

${deduplicatedSources.value && deduplicatedSources.value.length > 0 ? `
Sources:
${deduplicatedSources.value.map((source, index) => `${index + 1}. ${source.title || source.url} (${source.url})`).join('\n')}
` : ''}

${props.results.limitations && props.results.limitations.length > 0 ? `
Limitations:
${props.results.limitations.map(limitation => `• ${limitation}`).join('\n')}
` : ''}

${props.results.recommendations && props.results.recommendations.length > 0 ? `
Recommendations:
${props.results.recommendations.map(rec => `• ${rec}`).join('\n')}
` : ''}
`.trim()

  const blob = new Blob([plainTextReport], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `research-report-${new Date().toISOString().split('T')[0]}.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  notification.success({
    message: 'Download Started',
    description: 'Your research report is being downloaded.',
    duration: 3
  })
}
</script>

<style scoped>
.research-results {
  background: #ffffff;
  border-radius: 12px;
  padding: 32px;
  margin-top: 24px;
  border: 1px solid #e8e8e8;
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
}

.markdown-content :deep(h2) {
  font-family: 'DM Sans', 'LXGW WenKai', serif;
  font-size: 24px;
  font-weight: 600;
  color: #000000;
  margin: 28px 0 12px 0;
  scroll-margin-top: 80px;
  text-align: center;
}

.markdown-content :deep(h3) {
  font-family: 'DM Sans', 'LXGW WenKai', serif;
  font-size: 20px;
  font-weight: 600;
  color: #000000;
  margin: 24px 0 8px 0;
  scroll-margin-top: 80px;
  text-align: center;
}

.markdown-content :deep(h4) {
  font-family: 'DM Sans', 'LXGW WenKai', serif;
  font-size: 18px;
  font-weight: 600;
  color: #000000;
  margin: 20px 0 8px 0;
  scroll-margin-top: 80px;
}

.markdown-content :deep(p) {
  margin: 16px 0;
  text-align: justify;
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
  white-space: nowrap;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  border: 1px solid #e8e8e8;
  padding: 8px 12px;
  text-align: justify;
  min-width: 100px;
}

.markdown-content :deep(th) {
  background: #f5f5f5;
  font-weight: 600;
}

.markdown-content :deep(a) {
  color: #0066cc;
  text-decoration: underline;
}

.markdown-content :deep(a:hover) {
  color: #0052a3;
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

@media (max-width: 768px) {
  .research-results {
    padding: 20px;
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

  .markdown-content {
    font-size: 15px;
  }

  .markdown-content :deep(h1) {
    font-size: 28px;
  }

  .markdown-content :deep(h2) {
    font-size: 22px;
  }

  .markdown-content :deep(h3) {
    font-size: 18px;
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
    white-space: nowrap;
    max-width: 100%;
    -webkit-overflow-scrolling: touch;
  }

  .markdown-content :deep(th),
  .markdown-content :deep(td) {
    padding: 6px 8px;
    font-size: 14px;
    min-width: 80px;
  }
}
</style>
