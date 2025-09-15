<template>
  <div class="define-results" v-if="results">
    <div class="define-header">
      <div class="define-icon">🧠</div>
      <div class="define-title">{{ t('define.title') }}</div>
    </div>

    <!-- Error/Cancelled states -->
    <div v-if="results.cancelled" class="status-banner cancelled">Analysis cancelled</div>
    <div v-else-if="results.success === false" class="status-banner failed">{{ results.error || 'Failed to generate explanation' }}</div>

    <div class="term-section" v-if="originalClaim">
      <div class="label">{{ t('define.term') }}</div>
      <div class="term">{{ originalClaim }}</div>
    </div>

    <div id="definition-section" class="definition-section" v-if="normalizedDefinition">
      <div class="label">{{ t('define.definition') }}</div>
      <div class="definition" v-html="normalizedDefinition"></div>
    </div>

    <div id="examples-section" class="extras" v-if="normalizedExamples && normalizedExamples.length">
      <div class="examples">
        <div class="label">{{ t('define.examples') }}</div>
        <ul>
          <li v-for="(ex, i) in normalizedExamples" :key="i" v-html="ex"></li>
        </ul>
      </div>
    </div>

    <div id="notes-section" class="extras" v-if="normalizedNotes">
      <div class="notes">
        <div class="label">{{ t('define.notes') }}</div>
        <div class="note-text" v-html="normalizedNotes"></div>
      </div>
    </div>

    <div class="metadata">
      <div class="meta-item" v-if="results.completed_at">
        <span class="meta-label">{{ t('results.analysisCompleted') }}:</span>
        <span class="meta-value">{{ formatDate(results.completed_at) }}</span>
      </div>
      <div class="meta-item" v-if="results.session_id">
        <span class="meta-label">Session ID:</span>
        <span class="meta-value session-id">{{ results.session_id }}</span>
      </div>
    </div>

    <!-- Share -->
    <div id="share-section" class="share-section">
      <button class="share-button" @click="generatePreview">📸 {{ t('results.shareAsImage') }}</button>
    </div>

    <!-- Preview Modal -->
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
  </div>
  <div v-else class="define-placeholder">
    {{ t('define.placeholder') }}
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watchEffect } from 'vue'
import { Modal } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  results: Object,
  originalClaim: String
})

const emit = defineEmits(['headings-extracted'])

// Share preview state
const showPreview = ref(false)
const previewCanvas = ref(null)
let currentImageBlob = null

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

// Build TOC headings (not shown for define in HomeView yet, but emitted for consistency)
const tocHeadings = computed(() => {
  if (!props.results) return []
  const headings = []
  if (normalizedDefinition.value) {
    headings.push({ id: 'definition-section', text: t('define.definition'), level: 2 })
  }
  if (normalizedExamples.value && normalizedExamples.value.length) {
    headings.push({ id: 'examples-section', text: t('define.examples'), level: 2 })
  }
  if (normalizedNotes.value) {
    headings.push({ id: 'notes-section', text: t('define.notes'), level: 2 })
  }
  headings.push({ id: 'share-section', text: t('results.shareResults'), level: 2 })
  return headings
})

const emitHeadings = () => {
  nextTick(() => emit('headings-extracted', tocHeadings.value))
}

watchEffect(() => {
  if (props.results) emitHeadings()
})

// Generate share preview
const generatePreview = async () => {
  try {
    showPreview.value = true
    await nextTick()
    await createShareImage()
  } catch (error) {
    console.error('Error generating preview:', error)
    showPreview.value = false
    Modal.error({ title: 'Preview Generation Failed', content: 'Failed to generate preview. Please try again.' })
  }
}

const closePreview = () => {
  showPreview.value = false
  currentImageBlob = null
}

const createShareImage = async () => {
  const canvas = previewCanvas.value
  if (!canvas) throw new Error('Canvas not available')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas context not available')

  // Canvas size
  canvas.width = 1200
  canvas.height = 1400

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, canvas.height)
  bg.addColorStop(0, '#ffffff')
  bg.addColorStop(1, '#f8f9fa')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Border
  ctx.strokeStyle = '#e0e0e0'
  ctx.lineWidth = 1
  ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1)

  // Typography
  const brandFont = 'bold 28px serif'
  const titleFont = 'bold 46px serif'
  const bodyFont = 'normal 22px serif'
  const smallFont = 'normal 18px serif'

  let y = 70

  // Logo / brand
  ctx.font = brandFont
  ctx.fillStyle = '#000'
  ctx.textAlign = 'center'
  ctx.fillText('itLooksLegit.com', canvas.width / 2, y)
  y += 40

  // Title
  ctx.font = titleFont
  ctx.fillStyle = '#000'
  ctx.textAlign = 'center'
  ctx.fillText('Quick Explainer', canvas.width / 2, y)
  y += 60

  // Topic
  ctx.font = smallFont
  ctx.fillStyle = '#666'
  ctx.textAlign = 'left'
  ctx.fillText(`${t('define.term')}:`, 80, y)
  y += 36
  ctx.font = bodyFont
  ctx.fillStyle = '#333'
  const term = props.originalClaim || '—'
  const termLines = wrapText(ctx, term, canvas.width - 160)
  const termMax = Math.min(termLines.length, 3)
  for (let i = 0; i < termMax; i++) { ctx.fillText(termLines[i], 80, y); y += 32 }
  if (termLines.length > termMax) { ctx.fillText('...', 80, y); y += 32 }
  y += 20

  // Definition
  if (props.results?.definition) {
    ctx.font = smallFont
    ctx.fillStyle = '#666'
    ctx.fillText(`${t('define.definition')}:`, 80, y)
    y += 36
    ctx.font = bodyFont
    ctx.fillStyle = '#333'
    const defText = stripHtml(props.results.definition)
    const defLines = wrapText(ctx, defText, canvas.width - 160)
    const defMax = Math.min(defLines.length, 10)
    for (let i = 0; i < defMax; i++) { ctx.fillText(defLines[i], 80, y); y += 32 }
    if (defLines.length > defMax) { ctx.fillText('...', 80, y); y += 32 }
    y += 10
  }

  // Examples
  if (props.results?.examples && props.results.examples.length) {
    ctx.font = smallFont
    ctx.fillStyle = '#666'
    ctx.fillText(`${t('define.examples')}:`, 80, y)
    y += 36
    ctx.font = bodyFont
    ctx.fillStyle = '#333'
    const maxExamples = Math.min(props.results.examples.length, 4)
    for (let i = 0; i < maxExamples; i++) {
      const ex = `• ${props.results.examples[i]}`
      const exLines = wrapText(ctx, ex, canvas.width - 160)
      exLines.forEach(line => { ctx.fillText(line, 80, y); y += 32 })
      y += 4
    }
    if (props.results.examples.length > maxExamples) { ctx.fillText('...', 80, y); y += 32 }
    y += 10
  }

  // Notes
  if (props.results?.notes) {
    ctx.font = smallFont
    ctx.fillStyle = '#666'
    ctx.fillText(`${t('define.notes')}:`, 80, y)
    y += 36
    ctx.font = bodyFont
    ctx.fillStyle = '#333'
    const notesLines = wrapText(ctx, props.results.notes, canvas.width - 160)
    const notesMax = Math.min(notesLines.length, 6)
    for (let i = 0; i < notesMax; i++) { ctx.fillText(notesLines[i], 80, y); y += 32 }
    if (notesLines.length > notesMax) { ctx.fillText('...', 80, y); y += 32 }
  }

  // Footer
  y = Math.min(y + 30, canvas.height - 80)
  ctx.font = smallFont
  ctx.fillStyle = '#666'
  ctx.textAlign = 'center'
  const ts = props.results?.completed_at ? formatDate(props.results.completed_at) : new Date().toLocaleString()
  ctx.fillText(`Generated ${ts}`, canvas.width / 2, canvas.height - 40)

  // Prepare blob
  currentImageBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}

const downloadImage = () => {
  if (!currentImageBlob) return
  const url = URL.createObjectURL(currentImageBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'explainer.png'
  a.click()
  URL.revokeObjectURL(url)
}

const copyToClipboard = async () => {
  if (!currentImageBlob) return
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': currentImageBlob })])
    Modal.success({ title: 'Success', content: t('results.copyImageSuccess') })
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    Modal.error({ title: 'Copy Failed', content: t('results.copyImageFailed') })
  }
}

// Attempt to parse model output if JSON was returned inside definition text
const tryParseDefinitionPayload = (text) => {
  if (!text || typeof text !== 'string') return null
  let s = text.trim()
  // Strip code fences
  if (s.startsWith('```')) {
    const lines = s.split('\n')
    if (lines.length > 0 && lines[0].startsWith('```')) {
      lines.shift()
    }
    if (lines.length > 0 && lines[lines.length - 1].trim() === '```') {
      lines.pop()
    }
    s = lines.join('\n').trim()
  }
  // Extract first JSON object
  const start = s.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let end = -1
  for (let i = start; i < s.length; i++) {
    if (s[i] === '{') depth++
    else if (s[i] === '}') {
      depth--
      if (depth === 0) { end = i; break }
    }
  }
  if (end === -1) return null
  const jsonStr = s.slice(start, end + 1)
  try {
    const obj = JSON.parse(jsonStr)
    if (obj && (obj.definition || obj.examples || obj.notes)) return obj
  } catch {
    return null
  }
  return null
}

const normalizedDefinition = computed(() => {
  if (!props.results) return ''
  const raw = props.results.definition
  const parsed = tryParseDefinitionPayload(raw)
  return parsed?.definition || raw || ''
})

const normalizedExamples = computed(() => {
  if (!props.results) return []
  const rawList = Array.isArray(props.results.examples) ? props.results.examples : []
  const parsed = tryParseDefinitionPayload(props.results.definition)
  const examples = parsed?.examples || rawList
  return Array.isArray(examples) ? examples : []
})

const normalizedNotes = computed(() => {
  if (!props.results) return ''
  const raw = props.results.notes
  const parsed = tryParseDefinitionPayload(props.results.definition)
  return parsed?.notes || raw || ''
})

// Helpers
const stripHtml = (html) => {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

const wrapText = (ctx, text, maxWidth) => {
  // Split text into CJK and non-CJK segments
  const segments = text.match(/[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]|[^\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]+/g) || []
  const lines = []
  let currentLine = ''

  for (const segment of segments) {
    if (/^[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]+$/.test(segment)) {
      for (let i = 0; i < segment.length; i++) {
        const test = currentLine + segment[i]
        if (ctx.measureText(test).width > maxWidth && currentLine) {
          lines.push(currentLine)
          currentLine = segment[i]
        } else {
          currentLine = test
        }
      }
    } else {
      const words = segment.split(' ')
      for (const word of words) {
        if (!word) continue
        const test = currentLine + (currentLine ? ' ' : '') + word
        if (ctx.measureText(test).width > maxWidth && currentLine) {
          lines.push(currentLine)
          currentLine = word
        } else {
          currentLine = test
        }
      }
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}
</script>

<style scoped>
.define-results {
  background: #fff;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  padding: 20px;
  font-family: 'Crimson Text', serif;
}

.define-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.define-icon { font-size: 22px; }

.define-title {
  font-family: 'Playfair Display', serif;
  font-size: 20px;
  font-weight: 600;
}

.status-banner {
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 12px;
}
.status-banner.cancelled { background: #fff3cd; color: #8a6d3b; border: 1px solid #ffeeba; }
.status-banner.failed { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }

.label {
  font-size: 12px;
  color: #666;
  letter-spacing: 0.3px;
  margin-bottom: 6px;
  text-transform: uppercase;
}

.term {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 14px;
}

.definition { font-size: 16px; line-height: 1.6; color: #222; }

.examples ul { margin: 0; padding-left: 20px; }

.note-text { color: #444; }

.metadata {
  border-top: 1px solid #f0f0f0;
  margin-top: 16px;
  padding-top: 12px;
  font-size: 12px;
  color: #666;
}
.meta-item { display: flex; gap: 6px; }
.meta-label { color: #999; }
.session-id { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }

.share-section { margin-top: 16px; }
.share-button {
  background: #f1f3f5;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
}
.share-button:hover { background: #e9ecef; }

/* Preview modal styles */
.preview-modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.preview-content {
  background: #fff;
  border-radius: 12px;
  width: 90vw;
  max-width: 900px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}
.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
}
.close-button { border: none; background: transparent; font-size: 20px; cursor: pointer; }
.preview-image-container { padding: 12px; overflow: auto; display: flex; justify-content: center; }
.preview-canvas { width: 100%; height: auto; max-height: 70vh; background: #fff; }
.preview-actions { display: flex; gap: 10px; padding: 12px 16px; border-top: 1px solid #eee; justify-content: flex-end; }
.preview-action-button { padding: 8px 12px; border-radius: 8px; border: 1px solid #ddd; background: #f8f9fa; cursor: pointer; }
.preview-action-button.download { background: #e7f5ff; border-color: #a5d8ff; }
.preview-action-button.copy { background: #e6fcf5; border-color: #96f2d7; }

/* Simple pop animation */
.modal-pop-enter-active, .modal-pop-leave-active { transition: all 0.2s ease; }
.modal-pop-enter-from, .modal-pop-leave-to { opacity: 0; transform: scale(0.98); }

.define-placeholder { color: #666; font-style: italic; }
</style>
