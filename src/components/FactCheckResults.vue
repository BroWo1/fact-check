<template>
  <div class="results-container" v-if="results">
    <!--
    <div class="claim-section" v-if="originalClaim">
      <h3 class="section-title">{{ t('results.claimAnalyzed') }}</h3>
      <div class="claim-text">
        "{{ originalClaim }}"
      </div>
    </div>
  -->

    <!-- Verdict Section -->
    <div id="verdict-section" class="verdict-section" style="scroll-margin-top: 80px;">
      <div class="verdict-header">
        <div class="verdict-icon">{{ getVerdictIcon(results.verdict) }}</div>
        <div class="verdict-content">
          <h2 class="verdict-title" :style="{ color: getVerdictColor(results.verdict) }">
            {{ getVerdictTitle(results.verdict) }}
          </h2>
          <div class="confidence-score">
            {{ t('results.confidence') }}: {{ Math.round(results.confidence_score * 100) }}%
          </div>
        </div>
      </div>

      <div class="verdict-summary" v-if="results.summary">
        <p>{{ results.summary }}</p>
      </div>
    </div>

    <!-- Analysis Details -->
    <div id="analysis-details" class="analysis-details" v-if="results.reasoning" style="scroll-margin-top: 80px;">
      <h3 class="section-title">{{ t('results.analysis') }}</h3>
      <div class="reasoning-text" v-html="formatReasoningWithCitations(results.reasoning)">
      </div>
    </div>

    <!-- Citations Section -->
    <div id="citations-section" class="citations-section" v-if="extractCitations(results.reasoning).length > 0" style="scroll-margin-top: 80px;">
      <h3 class="section-title">{{ t('results.citations') }}</h3>
      <div class="citations-list">
        <div
          v-for="(citation, index) in extractCitations(results.reasoning)"
          :key="index"
          :id="`citation-${citation.number}`"
          class="citation-item"
        >
          <span class="citation-number">[{{ citation.number }}]</span>
          <a :href="citation.url" target="_blank" rel="noopener noreferrer" class="citation-link">
            {{ citation.title || citation.url }}
          </a>
          <span v-if="citation.publisher" class="citation-publisher">
            - {{ citation.publisher }}
          </span>
        </div>
      </div>
    </div>

    <!-- Evidence Section -->
    <div id="evidence-section" class="evidence-section" v-if="results.key_evidence || results.supporting_evidence || results.contradictory_evidence" style="scroll-margin-top: 80px;">
      <h3 class="section-title">{{ t('results.evidence') }}</h3>

      <!-- Key Evidence -->
      <div id="key-evidence" class="evidence-group" v-if="results.key_evidence && results.key_evidence.length > 0" style="scroll-margin-top: 80px;">
        <h4 class="evidence-title">{{ t('results.keyFindings') }}</h4>
        <ul class="evidence-list">
          <li v-for="evidence in results.key_evidence" :key="evidence" class="evidence-item key">
            <span class="evidence-icon">🔍</span>
            <div class="evidence-content" v-html="formatEvidenceWithCitations(evidence)"></div>
          </li>
        </ul>
      </div>

      <!-- Supporting Evidence -->
      <div id="supporting-evidence" class="evidence-group" v-if="results.supporting_evidence && results.supporting_evidence.length > 0" style="scroll-margin-top: 80px;">
        <h4 class="evidence-title">{{ t('results.supportingEvidence') }}</h4>
        <ul class="evidence-list">
          <li v-for="evidence in results.supporting_evidence" :key="evidence" class="evidence-item supporting">
            <span class="evidence-icon">✅</span>
            <div class="evidence-content" v-html="formatEvidenceWithCitations(evidence)"></div>
          </li>
        </ul>
      </div>

      <!-- Contradictory Evidence -->
      <div id="contradictory-evidence" class="evidence-group" v-if="results.contradictory_evidence && results.contradictory_evidence.length > 0" style="scroll-margin-top: 80px;">
        <h4 class="evidence-title">{{ t('results.contradictoryEvidence') }}</h4>
        <ul class="evidence-list">
          <li v-for="evidence in results.contradictory_evidence" :key="evidence" class="evidence-item contradictory">
            <span class="evidence-icon">❌</span>
            <div class="evidence-content" v-html="formatEvidenceWithCitations(evidence)"></div>
          </li>
        </ul>
      </div>
    </div>

    <!--
    <div class="sources-section" v-if="results.sources && results.sources.length > 0">
      <h3 class="section-title">Sources Checked</h3>
      <div class="sources-list">
        <div
          v-for="source in results.sources"
          :key="source.id || source.url"
          class="source-item"
          :class="{ 'supports-claim': source.supports_claim === true, 'contradicts-claim': source.supports_claim === false }"
        >
          <div class="source-header">
            <div class="source-title">
              <a :href="source.url" target="_blank" rel="noopener noreferrer" class="source-link">
                {{ source.title }}
              </a>
            </div>
            <div class="source-meta">
              <span class="source-publisher">{{ source.publisher }}</span>
              <span class="credibility-score" v-if="source.credibility_score">
                Credibility: {{ Math.round(source.credibility_score * 100) }}%
              </span>
            </div>
          </div>

          <div class="source-indicators">
            <div class="relevance-indicator" v-if="source.relevance_score">
              <span class="indicator-label">Relevance:</span>
              <div class="indicator-bar">
                <div
                  class="indicator-fill relevance"
                  :style="{ width: `${source.relevance_score * 100}%` }"
                ></div>
              </div>
              <span class="indicator-value">{{ Math.round(source.relevance_score * 100) }}%</span>
            </div>

            <div class="support-indicator" v-if="source.supports_claim !== undefined">
              <span class="support-badge" :class="{ 'supports': source.supports_claim, 'contradicts': !source.supports_claim }">
                {{ source.supports_claim ? 'Supports claim' : 'Contradicts claim' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    -->

    <!-- Limitations -->
    <div id="limitations-section" class="limitations-section" v-if="results.limitations && results.limitations.length > 0" style="scroll-margin-top: 80px;">
      <h3 class="section-title">{{ t('research.limitations') }}</h3>
      <ul class="limitations-list">
        <li v-for="limitation in results.limitations" :key="limitation" class="limitation-item">
          <span class="limitation-icon">⚠️</span>
          {{ limitation }}
        </li>
      </ul>
    </div>

    <!-- Recommendations -->
    <div class="recommendations-section" v-if="results.recommendations && results.recommendations.length > 0">
      <h3 class="section-title">{{ t('research.recommendations') }}</h3>
      <ul class="recommendations-list">
        <li v-for="recommendation in results.recommendations" :key="recommendation" class="recommendation-item">
          <span class="recommendation-icon">💡</span>
          {{ recommendation }}
        </li>
      </ul>
    </div>

    <!-- Metadata -->
    <div class="metadata-section">
      <div class="metadata-item">
        <span class="metadata-label">{{ t('results.analysisCompleted') }}:</span>
        <span class="metadata-value">{{ formatDate(results.completed_at) }}</span>
      </div>
      <div class="metadata-item" v-if="results.session_id">
        <span class="metadata-label">Session ID:</span>
        <span class="metadata-value session-id">{{ results.session_id }}</span>
      </div>
    </div>

    <!-- Share Section -->
    <div id="share-section" class="share-section" style="scroll-margin-top: 80px;">
      <button class="share-button" @click="generatePreview">
        📸 {{ t('results.shareAsImage') }}
      </button>
    </div>

    <!-- Preview Modal with animation -->
    <transition name="modal-pop">
      <div v-if="showPreview" class="preview-modal" @click="closePreview">
        <div class="preview-content" @click.stop>
          <div class="preview-header">
            <h3>Preview Share Image</h3>
            <button class="close-button" @click="closePreview">×</button>
          </div>
          <div class="preview-image-container">
            <canvas ref="previewCanvas" class="preview-canvas"></canvas>
          </div>
          <div class="preview-actions">
            <button class="preview-action-button download" @click="downloadImage">
              {{ t('results.downloadImage') }}
            </button>
            <button class="preview-action-button copy" @click="copyToClipboard">
              {{ t('results.copyToClipboard') }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Debug Section (only shown in development) -->
    <div class="debug-section" v-if="showDebug && citationDebugInfo && isDevelopment">
      <h3 class="section-title">Citation Debug Information</h3>
      <div class="debug-info">
        <div class="debug-item">
          <strong>Total Sources:</strong> {{ citationDebugInfo.totalSources }}
        </div>
        <div class="debug-item">
          <strong>Citation References:</strong> {{ citationDebugInfo.citationReferences }}
          ({{ citationDebugInfo.uniqueCitationReferences }} unique)
        </div>
        <div class="debug-item">
          <strong>URL References:</strong> {{ citationDebugInfo.urlReferences }}
          ({{ citationDebugInfo.uniqueUrlReferences }} unique)
        </div>
        <div class="debug-item">
          <strong>Final Citation Count:</strong> {{ citationDebugInfo.finalCitationCount }}
        </div>
        <div class="debug-item" v-if="citationDebugInfo.potentialDuplicates.length > 0">
          <strong>Potential Duplicates:</strong>
          <ul class="debug-duplicates">
            <li v-for="duplicate in citationDebugInfo.potentialDuplicates" :key="duplicate.sourceIndex">
              {{ duplicate.type }}: "{{ duplicate.value }}" (Source #{{ duplicate.sourceIndex + 1 }})
            </li>
          </ul>
        </div>
      </div>
      <button @click="showDebug = false" class="debug-toggle">Hide Debug Info</button>
    </div>

    <!-- Debug Toggle Button -->
    <div class="debug-toggle-container" v-if="!showDebug && isDevelopment">
      <button @click="showDebug = true" class="debug-toggle small">Show Debug Info</button>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, computed, watchEffect } from 'vue'
import { Modal } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { useCitationDeduplicator } from '../composables/useCitationDeduplicator'

const { t } = useI18n()

const props = defineProps({
  results: Object,
  originalClaim: String,
  uploadedImage: String,
  analysisSummary: {
    type: String,
    default: null
  }
})

// Preview modal state
const showPreview = ref(false)
const previewCanvas = ref(null)
const showDebug = ref(false)
let currentImageBlob = null

// Development environment check
const isDevelopment = ref(import.meta.env.DEV)

// Define emits for headings extraction
const emit = defineEmits(['headings-extracted'])

// Computed property for static TOC headings
const tocHeadings = computed(() => {
  if (!props.results) return []

  const headings = []

  // Verdict Section
  headings.push({
    id: 'verdict-section',
    text: t('results.verdict'),
    level: 2
  })

  // Analysis Details
  if (props.results.reasoning) {
    headings.push({
      id: 'analysis-details',
      text: t('results.analysis'),
      level: 2
    })
  }

  // Citations Section
  if (extractCitations(props.results.reasoning).length > 0) {
    headings.push({
      id: 'citations-section',
      text: t('results.citations'),
      level: 2
    })
  }

  // Evidence Section
  if (props.results.key_evidence || props.results.supporting_evidence || props.results.contradictory_evidence) {
    headings.push({
      id: 'evidence-section',
      text: t('results.evidence'),
      level: 2
    })

    // Key Findings subsection
    if (props.results.key_evidence && props.results.key_evidence.length > 0) {
      headings.push({
        id: 'key-evidence',
        text: t('results.keyFindings'),
        level: 3
      })
    }

    // Supporting Evidence subsection
    if (props.results.supporting_evidence && props.results.supporting_evidence.length > 0) {
      headings.push({
        id: 'supporting-evidence',
        text: t('results.supportingEvidence'),
        level: 3
      })
    }

    // Contradictory Evidence subsection
    if (props.results.contradictory_evidence && props.results.contradictory_evidence.length > 0) {
      headings.push({
        id: 'contradictory-evidence',
        text: t('results.contradictoryEvidence'),
        level: 3
      })
    }
  }

  // Limitations Section
  if (props.results.limitations && props.results.limitations.length > 0) {
    headings.push({
      id: 'limitations-section',
      text: t('research.limitations'),
      level: 2
    })
  }

  // Share Section
  headings.push({
    id: 'share-section',
    text: t('results.shareResults'),
    level: 2
  })

  return headings
})

// Function to emit headings when results change
const emitHeadings = () => {
  nextTick(() => {
    emit('headings-extracted', tocHeadings.value)
  })
}

// Watch for results changes and emit headings
watchEffect(() => {
  if (props.results) {
    emitHeadings()
  }
})

// Development-only logging helper
const devLog = (message, ...args) => {
  if (isDevelopment.value) {
    console.log(message, ...args)
  }
}

const devWarn = (message, ...args) => {
  if (isDevelopment.value) {
    console.warn(message, ...args)
  }
}

const getVerdictIcon = (verdict) => {
  const icons = {
    'true': '✅',
    'likely_true': '👍',
    'likely': '👍',
    'uncertain': '❓',
    'likely_false': '👎',
    'suspicious': '⚠️',
    'false': '❌'
  }
  return icons[verdict] || '❓'
}

const getVerdictTitle = (verdict) => {
  return t(`verdict.${verdict}`) || t('verdict.unknown')
}

const getVerdictColor = (verdict) => {
  const colors = {
    'true': '#22c55e',
    'likely_true': '#84cc16',
    'likely': '#84cc16',
    'uncertain': '#f59e0b',
    'likely_false': '#f97316',
    'suspicious': '#ef4444',
    'false': '#ef4444'
  }
  return colors[verdict] || '#6b7280'
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  try {
    return new Date(dateString).toLocaleString()
  } catch (error) {
    return dateString
  }
}

// Function to extract publisher name from URL
const extractPublisherFromUrl = (url) => {
  try {
    const hostname = new URL(url).hostname
    // Remove www. prefix and get just the domain name
    return hostname.replace(/^www\./, '').split('.')[0]
  } catch (error) {
    return url
  }
}

// Function to format evidence text with citation buttons
const formatEvidenceWithCitations = (evidenceText) => {
  if (!evidenceText) return ''

  // Regex to match markdown-style links in the format ([text](url))
  const markdownLinkRegex = /\(\[([^\]]+)\]\(([^)]+)\)\)/g

  let formattedText = evidenceText

  // Replace markdown links with citation buttons
  formattedText = formattedText.replace(markdownLinkRegex, (match, linkText, url) => {
    try {
      const publisherName = extractPublisherFromUrl(url)
      return ` <button
        class="citation-button"
        onclick="window.open('${url}', '_blank', 'noopener,noreferrer')"
        title="View source: ${linkText}"
      >
        📄 ${publisherName}
      </button>`
    } catch (error) {
      // Fallback to original text if URL parsing fails
      return ` <button
        class="citation-button"
        onclick="window.open('${url}', '_blank', 'noopener,noreferrer')"
        title="View source: ${linkText}"
      >
        📄 ${linkText}
      </button>`
    }
  })

  // Also handle regular markdown links [text](url) without parentheses
  const regularMarkdownRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  formattedText = formattedText.replace(regularMarkdownRegex, (match, linkText, url) => {
    try {
      const publisherName = extractPublisherFromUrl(url)
      return ` <button
        class="citation-button"
        onclick="window.open('${url}', '_blank', 'noopener,noreferrer')"
        title="View source: ${linkText}"
      >
        📄 ${publisherName}
      </button>`
    } catch (error) {
      return ` <button
        class="citation-button"
        onclick="window.open('${url}', '_blank', 'noopener,noreferrer')"
        title="View source: ${linkText}"
      >
        📄 ${linkText}
      </button>`
    }
  })

  return formattedText
}

// Function to extract citations from reasoning text
const extractCitations = (reasoningText) => {
  if (!reasoningText) return []

  const citations = []
  const deduplicator = useCitationDeduplicator()
  deduplicator.reset()

  // Helper function to add citation if not duplicate
  const addCitation = (citation) => {
    if (!deduplicator.isDuplicate(citation.url, citation.title)) {
      citations.push(citation)
      deduplicator.addCitation(citation.url, citation.title)
      return true
    }
    return false
  }

  // Extract citations in format [1], [2], etc. and match with sources if available
  const citationMatches = reasoningText.match(/\[(\d+)\]/g)
  if (citationMatches && props.results?.sources) {
    const uniqueNumbers = [...new Set(citationMatches.map(match => parseInt(match.replace(/[\[\]]/g, ''))))]

    uniqueNumbers.forEach(citationNumber => {
      const source = props.results.sources[citationNumber - 1]
      if (source && source.url) {
        try {
          const citation = {
            number: citationNumber,
            title: source.title || source.url,
            url: source.url,
            publisher: source.publisher || new URL(source.url).hostname
          }
          addCitation(citation)
        } catch (e) {
          // Skip invalid sources
        }
      }
    })
  }

  // Always extract direct URL citations from the text
  const urlMatches = reasoningText.match(/https?:\/\/[^\s\)\],]+/g)
  if (urlMatches) {
    const uniqueUrls = [...new Set(urlMatches)]
    uniqueUrls.forEach((url) => {
      try {
        const citation = {
          number: citations.length + 1,
          title: new URL(url).hostname,
          url: url,
          publisher: new URL(url).hostname
        }
        addCitation(citation)
      } catch (e) {
        // Skip invalid URLs
      }
    })
  }

  // If no citations found but we have sources, create basic citations
  if (citations.length === 0 && props.results?.sources && props.results.sources.length > 0) {
    props.results.sources.forEach((source, index) => {
      if (source && source.url) {
        try {
          const citation = {
            number: index + 1,
            title: source.title || source.url,
            url: source.url,
            publisher: source.publisher || new URL(source.url).hostname
          }
          addCitation(citation)
        } catch (e) {
          // Skip invalid sources
        }
      }
    })
  }

  // Re-number citations to ensure sequential numbering
  const finalCitations = citations
    .sort((a, b) => a.number - b.number)
    .map((citation, index) => ({
      ...citation,
      number: index + 1
    }))

  return finalCitations
}

// Function to format reasoning text with clickable citations
const formatReasoningWithCitations = (reasoningText) => {
  if (!reasoningText) return ''

  let formattedText = reasoningText
  const extractedCitations = extractCitations(reasoningText)

  // Create a mapping of original citation numbers to new sequential numbers
  const citationMapping = new Map()
  extractedCitations.forEach((citation, index) => {
    citationMapping.set(citation.number, index + 1)
  })

  // Replace citation numbers [1], [2], etc. with clickable links using the new numbering
  formattedText = formattedText.replace(/\[(\d+)\]/g, (match, number) => {
    const newNumber = citationMapping.get(parseInt(number)) || number
    return `<a href="#citation-${newNumber}" class="citation-link-inline" title="View citation ${newNumber}">${match}</a>`
  })

  // Replace URLs with clickable links (but preserve them for citation extraction)
  formattedText = formattedText.replace(/(https?:\/\/[^\s\)\],]+)/g, (url) => {
    try {
      const domain = new URL(url).hostname
      // Check if this URL is already in our citations to avoid redundancy
      const isInCitations = extractedCitations.some(citation =>
        citation.url === url || new URL(citation.url).hostname === domain
      )

      if (isInCitations) {
        // If URL is already in citations, just show domain name without link
        return `<span class="referenced-domain" title="Referenced in citations">${domain}</span>`
      } else {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="external-link" title="External link: ${domain}">${domain}</a>`
      }
    } catch (e) {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="external-link">${url}</a>`
    }
  })

  // Highlight parenthetical citations
  formattedText = formattedText.replace(/\([^)]*(?:Source|BBC|CNN|Reuters|AP|NPR|Guardian|Times|Post|Journal)[^)]*\)/gi, (match) => {
    return `<span class="parenthetical-citation" title="Citation reference">${match}</span>`
  })

  // Add line breaks for better readability
  formattedText = formattedText.replace(/\n/g, '<br>')

  return formattedText
}

// Function to generate preview
const generatePreview = async () => {
  try {
    // Show modal first so canvas is rendered
    showPreview.value = true

    // Wait for next tick to ensure canvas is rendered
    await nextTick()

    // Now create the image
    await createShareImage()
  } catch (error) {
    console.error('Error generating preview:', error)
    showPreview.value = false
    Modal.error({
      title: 'Preview Generation Failed',
      content: 'Failed to generate preview. Please try again.'
    })
  }
}

// Function to close preview
const closePreview = () => {
  showPreview.value = false
  currentImageBlob = null
}

// Function to create and display shareable image
const createShareImage = async () => {
  const canvas = previewCanvas.value
  if (!canvas) {
    throw new Error('Canvas not available')
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas context not available')
  }

  // Set canvas size (much larger for better content)
  canvas.width = 1200
  canvas.height = 1600

  // Set background with subtle gradient
  const backgroundGradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
  backgroundGradient.addColorStop(0, '#ffffff')
  backgroundGradient.addColorStop(1, '#f8f9fa')
  ctx.fillStyle = backgroundGradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Add subtle border
  ctx.strokeStyle = '#e0e0e0'
  ctx.lineWidth = 3
  ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4)

  // Enhanced fonts for better readability
  const brandFont = 'bold 32px serif'
  const titleFont = 'bold 48px serif'
  const headingFont = 'bold 40px serif'
  const bodyFont = '28px serif'
  const smallFont = '24px serif'
  const tinyFont = '20px serif'

  let currentY = 80

  // Load and add logo
  try {
    const logoImg = new Image()
    logoImg.crossOrigin = 'anonymous'

    // Multiple logo path strategies for production compatibility
    const logoSources = [
      '/logo.png',  // Public folder (production) - highest priority
      '/assets/logo.png',  // Public assets folder fallback
      window.location.origin + '/logo.png',  // Absolute URL
      window.location.origin + '/assets/logo.png',  // Absolute URL with assets
      '/src/assets/logo.png'  // Source assets (dev only)
    ]

    let logoLoaded = false

    for (const logoSrc of logoSources) {
      if (logoLoaded) break

      try {
        await new Promise((resolve, reject) => {
          // Set a timeout for image loading
          const timeout = setTimeout(() => {
            reject(new Error('Logo loading timeout'))
          }, 5000)

          logoImg.onload = () => {
            clearTimeout(timeout)
            logoLoaded = true
            devLog(`Logo loaded successfully from: ${logoSrc}`)
            resolve()
          }
          logoImg.onerror = (error) => {
            clearTimeout(timeout)
            reject(error)
          }
          logoImg.src = logoSrc
        })

        if (logoLoaded) {
          // Draw logo (centered, reasonable size)
          const logoSize = 80
          const logoX = (canvas.width - logoSize) / 2
          ctx.drawImage(logoImg, logoX, currentY, logoSize, logoSize)
          currentY += logoSize + 20
          break
        }
      } catch (error) {
        devWarn(`Failed to load logo from ${logoSrc}:`, error)
        continue
      }
    }

    // If no logo loaded, draw fallback
    if (!logoLoaded) {
      throw new Error('All logo sources failed')
    }

  } catch (error) {
    devWarn('Could not load logo, using fallback:', error)
    // Fallback: draw a branded text logo with better styling
    ctx.fillStyle = '#000000'
    ctx.font = 'bold 36px serif'
    ctx.textAlign = 'center'

    // Draw a simple logo background circle
    ctx.beginPath()
    ctx.arc(canvas.width / 2, currentY + 40, 40, 0, 2 * Math.PI)
    ctx.fillStyle = '#f0f0f0'
    ctx.fill()
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.stroke()

    // Draw the emoji/icon
    ctx.fillStyle = '#000000'
    ctx.fillText('📊', canvas.width / 2, currentY + 50)
    currentY += 100
  }

  // Add branding text
  ctx.font = brandFont
  ctx.fillStyle = '#000000'
  ctx.textAlign = 'center'
  ctx.fillText('itLooksLegit.com', canvas.width / 2, currentY)

  currentY += 60

  // Add title
  ctx.font = titleFont
  ctx.fillStyle = '#000000'
  ctx.textAlign = 'center'
  ctx.fillText('Fact-Check Analysis', canvas.width / 2, currentY)

  currentY += 100

  // Add claim section
  ctx.font = smallFont
  ctx.fillStyle = '#666666'
  ctx.textAlign = 'left'
  ctx.fillText('Claim:', 80, currentY)
  currentY += 45

  // Add claim text with better wrapping
  ctx.font = bodyFont
  ctx.fillStyle = '#333333'
  const claimText = props.originalClaim || 'Claim not available'
  const wrappedClaim = wrapText(ctx, claimText, canvas.width - 160, 28)
  const maxClaimLines = Math.min(wrappedClaim.length, 5) // Limit to 5 lines
  for (let i = 0; i < maxClaimLines; i++) {
    ctx.fillText(wrappedClaim[i], 80, currentY)
    currentY += 35
  }
  if (wrappedClaim.length > maxClaimLines) {
    ctx.fillText('...', 80, currentY)
    currentY += 35
  }

  currentY += 40

  // Add uploaded image thumbnail if available
  if (props.uploadedImage) {
    try {
      const uploadedImg = new Image()
      uploadedImg.crossOrigin = 'anonymous'

      // Handle different image source formats
      let imageSrc = props.uploadedImage

      // If it's a data URL, use it directly
      if (imageSrc.startsWith('data:')) {
        uploadedImg.src = imageSrc
      } else if (imageSrc.startsWith('blob:')) {
        // For blob URLs, use directly
        uploadedImg.src = imageSrc
      } else {
        // For regular URLs, try multiple strategies
        const imageSources = [
          imageSrc,
          window.location.origin + imageSrc,
          imageSrc.startsWith('/') ? imageSrc : '/' + imageSrc
        ]

        let imageLoaded = false

        for (const imgSrc of imageSources) {
          if (imageLoaded) break

          try {
            await new Promise((resolve, reject) => {
              // Set a timeout for image loading
              const timeout = setTimeout(() => {
                reject(new Error('Image loading timeout'))
              }, 5000)

              uploadedImg.onload = () => {
                clearTimeout(timeout)
                imageLoaded = true
                devLog(`Uploaded image loaded successfully from: ${imgSrc}`)
                resolve()
              }
              uploadedImg.onerror = (error) => {
                clearTimeout(timeout)
                reject(error)
              }
              uploadedImg.src = imgSrc
            })
            break
          } catch (error) {
            devWarn(`Failed to load image from ${imgSrc}:`, error)
            continue
          }
        }

        if (!imageLoaded) {
          throw new Error('All image sources failed')
        }
      }

      // Wait for image to load if not already loaded
      if (!uploadedImg.complete) {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Image loading timeout'))
          }, 5000)

          uploadedImg.onload = () => {
            clearTimeout(timeout)
            resolve()
          }
          uploadedImg.onerror = (error) => {
            clearTimeout(timeout)
            reject(error)
          }
        })
      }

      // Calculate thumbnail size (maintain aspect ratio)
      const maxThumbnailWidth = 300
      const maxThumbnailHeight = 200
      let thumbnailWidth = uploadedImg.width
      let thumbnailHeight = uploadedImg.height

      // Scale down if too large
      if (thumbnailWidth > maxThumbnailWidth || thumbnailHeight > maxThumbnailHeight) {
        const scaleX = maxThumbnailWidth / thumbnailWidth
        const scaleY = maxThumbnailHeight / thumbnailHeight
        const scale = Math.min(scaleX, scaleY)
        thumbnailWidth = thumbnailWidth * scale
        thumbnailHeight = thumbnailHeight * scale
      }

      // Center the thumbnail
      const thumbnailX = (canvas.width - thumbnailWidth) / 2

      // Add thumbnail label
      ctx.font = tinyFont
      ctx.fillStyle = '#666666'
      ctx.textAlign = 'center'
      ctx.fillText('Uploaded Image:', canvas.width / 2, currentY)
      currentY += 35

      // Add border around thumbnail
      ctx.strokeStyle = '#ddd'
      ctx.lineWidth = 2
      ctx.strokeRect(thumbnailX - 2, currentY - 2, thumbnailWidth + 4, thumbnailHeight + 4)

      // Draw thumbnail
      ctx.drawImage(uploadedImg, thumbnailX, currentY, thumbnailWidth, thumbnailHeight)
      currentY += thumbnailHeight + 50

    } catch (error) {
      devWarn('Could not load uploaded image:', error)
      // Fallback: show placeholder
      ctx.font = tinyFont
      ctx.fillStyle = '#666666'
      ctx.textAlign = 'center'
      ctx.fillText('Uploaded Image: [Could not load]', canvas.width / 2, currentY)
      currentY += 50
    }
  }

  // Add verdict section with enhanced styling
  const verdict = props.results?.verdict || 'unknown'
  const verdictTitle = getVerdictTitle(verdict)
  const verdictColor = getVerdictColor(verdict)
  const verdictIcon = getVerdictIcon(verdict)

  // Create enhanced gradient background for verdict
  const verdictBgHeight = 140
  const verdictGradient = ctx.createLinearGradient(0, currentY - 30, 0, currentY + verdictBgHeight - 30)
  verdictGradient.addColorStop(0, verdictColor + '25')
  verdictGradient.addColorStop(1, verdictColor + '10')

  ctx.fillStyle = verdictGradient
  ctx.fillRect(80, currentY - 30, canvas.width - 160, verdictBgHeight)

  // Add verdict border with rounded corners effect
  ctx.strokeStyle = verdictColor
  ctx.lineWidth = 4
  ctx.strokeRect(80, currentY - 30, canvas.width - 160, verdictBgHeight)

  // Verdict text
  ctx.font = headingFont
  ctx.fillStyle = verdictColor
  ctx.textAlign = 'center'
  ctx.fillText(`${verdictIcon} ${verdictTitle}`, canvas.width / 2, currentY + 30)

  // Confidence score
  if (props.results?.confidence_score) {
    ctx.font = smallFont
    ctx.fillStyle = '#666666'
    ctx.fillText(`${t('results.confidence')}: ${Math.round(props.results.confidence_score * 100)}%`, canvas.width / 2, currentY + 70)
  }

  currentY += 170

  // Add summary if available
  if (props.results?.summary) {
    ctx.font = smallFont
    ctx.fillStyle = '#666666'
    ctx.textAlign = 'left'
    ctx.fillText('Summary:', 80, currentY)
    currentY += 45

    ctx.font = bodyFont
    ctx.fillStyle = '#333333'
    const wrappedSummary = wrapText(ctx, props.results.summary, canvas.width - 160, 28)
    const maxSummaryLines = Math.min(wrappedSummary.length, 8) // Increased to 8 lines
    for (let i = 0; i < maxSummaryLines; i++) {
      ctx.fillText(wrappedSummary[i], 80, currentY)
      currentY += 35
    }
    if (wrappedSummary.length > maxSummaryLines) {
      ctx.fillText('...', 80, currentY)
      currentY += 35
    }
  }

  // Add key evidence if available
  if (props.results?.key_evidence && props.results.key_evidence.length > 0) {
    currentY += 40
    ctx.font = smallFont
    ctx.fillStyle = '#666666'
    ctx.textAlign = 'left'
    ctx.fillText('Key Findings:', 80, currentY)
    currentY += 45

    ctx.font = bodyFont
    ctx.fillStyle = '#333333'
    const maxEvidence = Math.min(props.results.key_evidence.length, 3) // Show top 3
    for (let i = 0; i < maxEvidence; i++) {
      const evidence = props.results.key_evidence[i]
      ctx.fillText('🔍', 80, currentY)

      const wrappedEvidence = wrapText(ctx, evidence, canvas.width - 160, 28)
      const maxEvidenceLines = Math.min(wrappedEvidence.length, 2) // Max 2 lines per evidence
      for (let j = 0; j < maxEvidenceLines; j++) {
        ctx.fillText(wrappedEvidence[j], 120, currentY)
        currentY += 35
      }
      if (wrappedEvidence.length > maxEvidenceLines) {
        ctx.fillText('...', 120, currentY)
        currentY += 35
      }
      currentY += 10
    }
  }

  // Add footer with enhanced styling
  const footerY = canvas.height - 60
  ctx.font = smallFont
  ctx.fillStyle = '#999999'
  ctx.textAlign = 'center'
  const analysisDate = props.results?.completed_at
    ? new Date(props.results.completed_at).toLocaleDateString()
    : new Date().toLocaleDateString()
  ctx.fillText(`${t('results.analysisCompleted')}: ${analysisDate}`, canvas.width / 2, footerY)

  // Add session ID if available (very small at bottom)
  if (props.results?.session_id) {
    ctx.font = tinyFont
    ctx.fillStyle = '#cccccc'
    ctx.fillText(`ID: ${props.results.session_id.slice(0, 8)}...`, canvas.width / 2, footerY + 30)
  }

  // Create blob for download/copy functionality
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      currentImageBlob = blob
      resolve(blob)
    }, 'image/png')
  })
}

// Function to download image
const downloadImage = () => {
  if (!currentImageBlob) return

  const url = URL.createObjectURL(currentImageBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = `fact-check-result-${Date.now()}.png`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Function to copy to clipboard
const copyToClipboard = async () => {
  if (!currentImageBlob) return

  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': currentImageBlob
      })
    ])
    Modal.success({
      title: 'Success',
      content: t('results.copyImageSuccess')
    })
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    Modal.error({
      title: 'Copy Failed',
      content: t('results.copyImageFailed')
    })
  }
}

// Helper function to wrap text
const wrapText = (ctx, text, maxWidth, fontSize) => {
  // Split text into CJK and non-CJK segments
  const segments = text.match(/([\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]|[^\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]+)/g) || [];
  const lines = [];
  let currentLine = '';

  for (const segment of segments) {
    // If segment is CJK, wrap by character
    if (/^[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]+$/.test(segment)) {
      for (let i = 0; i < segment.length; i++) {
        const testLine = currentLine + segment[i];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = segment[i];
        } else {
          currentLine = testLine;
        }
      }
    } else {
      // Non-CJK: wrap by word
      const words = segment.split(' ');
      for (const word of words) {
        if (word === '') continue;
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

// Computed property for debugging citation duplicates
const citationDebugInfo = computed(() => {
  if (!props.results?.sources || !props.results?.reasoning) return null

  const reasoning = props.results.reasoning
  const sources = props.results.sources

  // Find all citation references in the text
  const citationMatches = reasoning.match(/\[(\d+)\]/g) || []
  const urlMatches = reasoning.match(/https?:\/\/[^\s\)\],]+/g) || []

  // Create debug information
  const debugInfo = {
    totalSources: sources.length,
    citationReferences: citationMatches.length,
    uniqueCitationReferences: [...new Set(citationMatches)].length,
    urlReferences: urlMatches.length,
    uniqueUrlReferences: [...new Set(urlMatches)].length,
    finalCitationCount: extractCitations(reasoning).length,
    potentialDuplicates: []
  }

  // Check for potential duplicates
  const urls = new Set()
  const titles = new Set()

  sources.forEach((source, index) => {
    if (source.url) {
      const normalizedUrl = source.url.toLowerCase().replace(/\/$/, '')
      if (urls.has(normalizedUrl)) {
        debugInfo.potentialDuplicates.push({
          type: 'url',
          value: source.url,
          sourceIndex: index
        })
      } else {
        urls.add(normalizedUrl)
      }
    }

    if (source.title) {
      const normalizedTitle = source.title.toLowerCase().trim()
      if (titles.has(normalizedTitle)) {
        debugInfo.potentialDuplicates.push({
          type: 'title',
          value: source.title,
          sourceIndex: index
        })
      } else {
        titles.add(normalizedTitle)
      }
    }
  })

  return debugInfo
})

// Utility function to manually clean duplicate citations (for advanced use)
const cleanDuplicateCitations = (citations) => {
  const cleaned = []
  const seenUrls = new Set()
  const seenTitles = new Set()

  citations.forEach(citation => {
    const normalizedUrl = citation.url.toLowerCase().replace(/\/$/, '')
    const normalizedTitle = citation.title.toLowerCase().trim()

    if (!seenUrls.has(normalizedUrl) && !seenTitles.has(normalizedTitle)) {
      cleaned.push(citation)
      seenUrls.add(normalizedUrl)
      seenTitles.add(normalizedTitle)
    }
  })

  // Re-number the cleaned citations
  return cleaned.map((citation, index) => ({
    ...citation,
    number: index + 1
  }))
}
</script>

<style scoped>

@font-face {
  font-family: 'LXGW Neo ZhiSong Plus';
  src: url('../assets/fonts/LXGWNeoZhiSongPlus.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}

/* Global styles for dynamically inserted content */
:deep(.citation-button) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #ffffff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 2px 8px;
  font-family: 'DM Sans', 'LXGW WenKai', serif;
  font-size: 11px;
  font-weight: 500;
  color: #595959;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.15s ease;
  margin: 0 2px 2px 0;
  white-space: nowrap;
  vertical-align: baseline;
  position: relative;
  top: -1px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

:deep(.citation-button:hover) {
  background: #f5f5f5;
  border-color: #000000;
  color: #000000;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transform: none;
}

:deep(.citation-button:active) {
  background: #e6e6e6;
  border-color: #000000;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

:deep(.citation-button:focus) {
  outline: 1px solid #000000;
  outline-offset: 1px;
}

p, li{
  text-align: justify;
}
.results-container {
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
  margin: 20px 0;
  border: 1px solid #e9ecef;
  font-family: 'DM Sans', 'LXGW WenKai', serif;
  scroll-behavior: smooth;
}

/* Claim Section */
.claim-section {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.claim-text {
  font-size: 18px;
  line-height: 1.6;
  color: #333333;
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid #1890ff;
  font-style: italic;
  font-family: 'DM Sans', 'LXGW WenKai', serif;
}

/* Verdict Section */
.verdict-section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 2px solid #f0f0f0;
}

.verdict-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.verdict-icon {
  font-size: 48px;
  line-height: 1;
}

.verdict-title {
  font-family: 'Playfair Display', serif;
  font-size: 32px;
  font-weight: 700;
  color: #000000;
  margin: 0 0 8px 0;
}

.confidence-score {
  font-size: 16px;
  color: #666666;
  font-weight: 600;
}

.verdict-summary {
  font-size: 18px;
  line-height: 1.6;
  color: #333333;
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid #000000;
}

/* Section Titles */
.section-title {
  font-family: 'Playfair Display', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 20px;
  font-weight: 600;
  color: #000000;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #e9ecef;
  text-align: center;
}

/* Analysis Details */
.analysis-details {
  margin-bottom: 32px;
}

.reasoning-text {
  font-size: 16px;
  line-height: 1.6;
  color: #333333;
  text-align: justify;
}

.reasoning-text .parenthetical-citation {
  color: #1890ff;
  font-weight: 500;
  background: #f0f8ff;
  padding: 1px 3px;
  border-radius: 3px;
  border: 1px solid #d6e4ff;
}

.reasoning-text .citation-link-inline {
  color: #1890ff;
  text-decoration: none;
  font-weight: 600;
  padding: 1px 3px;
  border-radius: 3px;
  background: #f0f8ff;
  border: 1px solid #d6e4ff;
  transition: all 0.2s ease;
}

.reasoning-text .citation-link-inline:hover {
  background: #e6f4ff;
  border-color: #b3d9ff;
  text-decoration: none;
}

.reasoning-text .external-link {
  color: #52c41a;
  text-decoration: none;
  font-weight: 500;
  padding: 1px 3px;
  border-radius: 3px;
  background: #f6ffed;
  border: 1px solid #d9f7be;
  transition: all 0.2s ease;
}

.reasoning-text .external-link:hover {
  background: #f0f9e8;
  border-color: #b7eb8f;
  text-decoration: none;
}

.reasoning-text .referenced-domain {
  color: #666666;
  font-weight: 500;
  background: #f5f5f5;
  padding: 1px 3px;
  border-radius: 3px;
  border: 1px solid #d9d9d9;
}

/* Citations Section */
.citations-section {
  margin-bottom: 32px;
}

.citations-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.citation-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 6px;
  font-size: 14px;
  line-height: 1.4;
}

.citation-item:target {
  background: #e6f7ff;
  border: 1px solid #91d5ff;
  transform: scale(1.02);
  transition: all 0.3s ease;
}

.citation-number {
  color: #666666;
  font-weight: 600;
  min-width: 30px;
  flex-shrink: 0;
}

.citation-link {
  color: #000000;
  text-decoration: none;
  font-weight: 500;
  flex: 1;
  word-wrap: break-word;
  word-break: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
  text-align: center;
}

.citation-link:hover {
  text-decoration: underline;
  color: #1890ff;
}

.citation-publisher {
  color: #666666;
  font-style: italic;
  font-size: 12px;
}

/* Evidence Section */
.evidence-section {
  margin-bottom: 32px;
}

.evidence-group {
  margin-bottom: 24px;
}

.evidence-title {
  font-size: 16px;
  font-weight: 600;
  color: #000000;
  margin: 0 0 12px 0;
  text-align: center;
}

.evidence-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.evidence-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 0;
  font-size: 14px;
  line-height: 1.5;
  color: #333333;
  word-wrap: break-word;
  word-break: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
}

.evidence-icon {
  font-size: 16px;
  margin-top: 2px;
  flex-shrink: 0;
}

.evidence-content {
  flex: 1;
  line-height: 1.6;
}

/* Citation Button Styles - keeping original for reference */
.citation-button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #ffffff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 2px 8px;
  font-family: 'DM Sans', 'LXGW WenKai', serif;
  font-size: 11px;
  font-weight: 500;
  color: #595959;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.15s ease;
  margin: 0 2px 2px 0;
  white-space: nowrap;
  vertical-align: baseline;
  position: relative;
  top: -1px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.citation-button:hover {
  background: #f5f5f5;
  border-color: #000000;
  color: #000000;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transform: none;
}

.citation-button:active {
  background: #e6e6e6;
  border-color: #000000;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

.citation-button:focus {
  outline: 1px solid #000000;
  outline-offset: 1px;
}

/* Sources Section */
.sources-section {
  margin-bottom: 32px;
}

.sources-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.source-item {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s ease;
}

.source-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.source-item.supports-claim {
  border-left: 4px solid #52c41a;
}

.source-item.contradicts-claim {
  border-left: 4px solid #f5222d;
}

.source-header {
  margin-bottom: 12px;
}

.source-title {
  margin-bottom: 4px;
}

.source-link {
  color: #000000;
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
  line-height: 1.4;
}

.source-link:hover {
  text-decoration: underline;
}

.source-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #666666;
}

.source-publisher {
  font-weight: 600;
}

.credibility-score {
  color: #333333;
}

.source-indicators {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.relevance-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.indicator-label {
  color: #666666;
  min-width: 60px;
}

.indicator-bar {
  flex: 1;
  height: 4px;
  background: #e9ecef;
  border-radius: 2px;
  overflow: hidden;
}

.indicator-fill.relevance {
  height: 100%;
  background: #1890ff;
  transition: width 0.3s ease;
}

.indicator-value {
  color: #333333;
  font-weight: 600;
  min-width: 30px;
}

.support-indicator {
  display: flex;
  align-items: center;
}

.support-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.support-badge.supports {
  background: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}

.support-badge.contradicts {
  background: #fff2f0;
  color: #f5222d;
  border: 1px solid #ffccc7;
}

/* Limitations and Recommendations */
.limitations-section,
.recommendations-section {
  margin-bottom: 24px;
}

.limitations-list,
.recommendations-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.limitation-item,
.recommendation-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 0;
  font-size: 14px;
  line-height: 1.5;
  color: #333333;
}

.limitation-icon,
.recommendation-icon {
  font-size: 16px;
  margin-top: 2px;
  flex-shrink: 0;
}

/* Metadata */
.metadata-section {
  border-top: 1px solid #f0f0f0;
  padding-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metadata-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.metadata-label {
  color: #666666;
}

.metadata-value {
  color: #333333;
  font-weight: 500;
}

.session-id {
  font-family: monospace;
  font-size: 10px;
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
}

@media (max-width: 768px) {
  p{
    font-size: 14px;
    margin: 14px, 0;
  }
  .results-container {
    padding: 16px;
  }

  .verdict-header {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }

  .verdict-title {
    font-size: 24px;
  }

  .source-meta {
    flex-direction: column;
    gap: 4px;
  }

  .relevance-indicator {
    flex-wrap: wrap;
  }

  .metadata-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .citation-button {
    font-size: 10px;
    padding: 2px 6px;
    margin: 0 1px 2px 0;
  }

  :deep(.citation-button) {
    font-size: 10px;
    padding: 2px 6px;
    margin: 0 1px 2px 0;
  }
}

/* Share Section */
.share-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e9ecef;
  text-align: center;
}

.share-button {
  background: #000000;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-family: 'Playfair Display', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.share-button:hover {
  background: #333333;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.share-button:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

@media (max-width: 768px) {
  .share-button {
    padding: 10px 20px;
    font-size: 14px;
  }
}

/* Share Section */
.share-section {
  margin-top: 30px;
  text-align: center;
  padding: 20px;
  border-top: 1px solid #e9ecef;
}

.share-button {
  background: #000000;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-family: 'DM Sans', 'LXGW WenKai', serif;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.share-button:hover {
  background: #333333;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* Preview Modal */
.preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.preview-content {
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  max-width: 90vw;
  max-height: 90vh;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e9ecef;
}

.preview-header h3 {
  margin: 0;
  font-family: 'Playfair Display', serif;
  font-size: 24px;
  color: #000000;
  font-weight: 700;
}

.close-button {
  background: none;
  border: none;
  font-size: 32px;
  color: #999999;
  cursor: pointer;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.close-button:hover {
  background: #f5f5f5;
  color: #000000;
}

.preview-image-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: auto;
  margin-bottom: 20px;
}

.preview-canvas {
  max-width: 100%;
  max-height: 70vh;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  font-family: 'DM Sans', 'LXGW WenKai', serif;
}

.preview-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  padding-top: 16px;
  border-top: 1px solid #e9ecef;
}

.preview-action-button {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-family: 'DM Sans', 'LXGW WenKai', serif;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 140px;
}

.preview-action-button.download {
  background: #000000;
  color: #ffffff;
}

.preview-action-button.download:hover {
  background: #333333;
  transform: translateY(-2px);
}

.preview-action-button.copy {
  background: #f8f9fa;
  color: #000000;
  border: 2px solid #000000;
}

.preview-action-button.copy:hover {
  background: #000000;
  color: #ffffff;
  transform: translateY(-2px);
}

/* Responsive Design */
@media (max-width: 768px) {
  .preview-content {
    padding: 16px;
    max-width: 95vw;
    max-height: 95vh;
  }

  .preview-header h3 {
    font-size: 20px;
  }

  .preview-actions {
    flex-direction: column;
    gap: 12px;
  }

  .preview-action-button {
    width: 100%;
    min-width: auto;
  }

  .preview-canvas {
    max-height: 60vh;
  }

  .share-button {
    padding: 10px 20px;
    font-size: 14px;
  }
}

/* Modal pop animation */
.modal-pop-enter-active, .modal-pop-leave-active {
  transition: opacity 0.3s cubic-bezier(.4,2,.6,1), transform 0.3s cubic-bezier(.4,2,.6,1);
}
.modal-pop-enter-from, .modal-pop-leave-to {
  opacity: 0;
  transform: scale(0.85);
}
.modal-pop-enter-to, .modal-pop-leave-from {
  opacity: 1;
  transform: scale(1);
}

/* Add custom font-face for Chinese display */


/* Also apply to modal preview if needed */
.preview-canvas {
  font-family: 'DM Sans', 'LXGW WenKai', serif;
}

/* Debug Section */
.debug-section {
  margin-bottom: 32px;
  padding: 16px;
  background: #fff7e6;
  border: 1px solid #ffc069;
  border-radius: 8px;
}

.debug-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.debug-item {
  font-size: 14px;
  color: #333333;
}

.debug-duplicates {
  margin-top: 8px;
  padding-left: 20px;
  color: #d46b08;
}

.debug-toggle {
  background: #fa8c16;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s ease;
}

.debug-toggle:hover {
  background: #d46b08;
}

.debug-toggle.small {
  background: #f0f0f0;
  color: #666666;
  border: 1px solid #d9d9d9;
}

.debug-toggle.small:hover {
  background: #e6e6e6;
  border-color: #b3b3b3;
}

.debug-toggle-container {
  margin-bottom: 16px;
  text-align: center;
}
</style>
