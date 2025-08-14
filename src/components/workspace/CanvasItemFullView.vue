<template>
  <div class="canvas-item-fullview">
    <div class="fullview-header">
      <div class="header-left">
        <component :is="typeIcon" :size="20" />
        <h2>{{ item.title || t(`workspace.${item.type}`) }}</h2>
        <span class="type-badge">{{ t(`workspace.${item.type}`) }}</span>
      </div>
      
      <div class="header-actions">
        <Button 
          v-if="item.type === 'document'"
          :class="['edit-toggle-btn', { active: isEditing }]"
          @click="toggleEditing"
        >
          <Edit :size="16" />
          {{ isEditing ? t('workspace.view') : t('workspace.edit') }}
        </Button>
        
        <Button class="close-btn" @click="$emit('close')">
          <X :size="16" />
        </Button>
      </div>
    </div>

    <div class="fullview-content" ref="contentContainer">
      <!-- Research Content -->
      <div v-if="item.type === 'research'" class="research-fullview">
        <div v-if="item.results" class="research-results">
          <div class="results-header">
            <h3>{{ t('workspace.researchResults') }}</h3>
            <div class="results-meta">
              <span class="result-count">{{ item.results.length }} {{ t('workspace.results') }}</span>
              <span class="result-status" :class="item.status">{{ item.status }}</span>
            </div>
          </div>
          
          <div class="results-grid">
            <div 
              v-for="(result, index) in item.results"
              :key="result.id || index"
              class="result-card"
            >
              <div class="result-header">
                <h4>{{ result.title }}</h4>
                <div class="result-relevance" v-if="result.relevance">
                  {{ result.relevance }}% {{ t('workspace.relevant') }}
                </div>
              </div>
              <div class="result-content">
                <p class="result-snippet">{{ result.snippet }}</p>
                <div class="result-source" v-if="result.url">
                  <a :href="result.url" target="_blank" rel="noopener noreferrer">
                    <ExternalLink :size="14" />
                    {{ result.domain || result.url }}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="placeholder-fullview">
          <Search :size="64" />
          <h3>{{ t('workspace.noResearchData') }}</h3>
          <p>{{ t('workspace.noResearchDataDesc') }}</p>
        </div>
      </div>

      <!-- Fact Check Content -->
      <div v-if="item.type === 'factcheck'" class="factcheck-fullview">
        <div v-if="item.verdict" class="factcheck-results">
          <div class="verdict-section">
            <div class="verdict-main">
              <div class="verdict-badge" :class="item.verdict">
                <span class="verdict-icon">{{ getVerdictIcon(item.verdict) }}</span>
                <span class="verdict-text">{{ t(`verdict.${item.verdict}`) || item.verdict }}</span>
              </div>
              <div class="confidence-display" v-if="item.confidence">
                <div class="confidence-bar">
                  <div 
                    class="confidence-fill" 
                    :style="{ width: `${item.confidence}%` }"
                  ></div>
                </div>
                <span class="confidence-text">{{ item.confidence }}% {{ t('workspace.confidence') }}</span>
              </div>
            </div>
          </div>
          
          <div class="claim-section" v-if="item.claim">
            <h3>{{ t('workspace.claimAnalyzed') }}</h3>
            <blockquote class="claim-text">{{ item.claim }}</blockquote>
          </div>
          
          <div class="analysis-section" v-if="item.analysis">
            <h3>{{ t('workspace.analysis') }}</h3>
            <div class="analysis-content" v-html="formatText(item.analysis)"></div>
          </div>
          
          <div class="evidence-section" v-if="item.evidence">
            <h3>{{ t('workspace.evidence') }}</h3>
            <div class="evidence-list">
              <div 
                v-for="(evidence, index) in item.evidence"
                :key="index"
                class="evidence-item"
              >
                <div class="evidence-header">
                  <span class="evidence-type" :class="evidence.type">{{ evidence.type }}</span>
                  <span class="evidence-strength">{{ evidence.strength }}</span>
                </div>
                <p class="evidence-text">{{ evidence.description }}</p>
                <a 
                  v-if="evidence.source"
                  :href="evidence.source"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="evidence-source"
                >
                  <ExternalLink :size="14" />
                  {{ t('workspace.viewSource') }}
                </a>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="placeholder-fullview">
          <CheckCircle :size="64" />
          <h3>{{ t('workspace.noFactCheckData') }}</h3>
          <p>{{ t('workspace.noFactCheckDataDesc') }}</p>
        </div>
      </div>

      <!-- Document Content -->
      <div v-if="item.type === 'document'" class="document-fullview">
        <div v-if="isEditing" class="document-editor-fullview">
          <Input.TextArea
            v-model:value="editingContent"
            :placeholder="t('workspace.documentPlaceholder')"
            class="document-textarea"
            :auto-size="{ minRows: 20, maxRows: 50 }"
            @keydown="handleKeyDown"
          />
          <div class="editor-actions">
            <Button @click="cancelEditing">{{ t('common.cancel') }}</Button>
            <Button type="primary" @click="saveContent">{{ t('workspace.save') }}</Button>
          </div>
        </div>
        <div v-else class="document-display-fullview">
          <div v-if="item.content" class="document-content" v-html="formatText(item.content)"></div>
          <div v-else class="placeholder-fullview">
            <FileText :size="64" />
            <h3>{{ t('workspace.emptyDocument') }}</h3>
            <p>{{ t('workspace.emptyDocumentDesc') }}</p>
            <Button type="primary" @click="startEditing">{{ t('workspace.startWriting') }}</Button>
          </div>
        </div>
      </div>

      <!-- Webpage Content -->
      <div v-if="item.type === 'webpage'" class="webpage-fullview">
        <div v-if="item.url" class="webpage-container">
          <div class="url-header">
            <Globe :size="16" />
            <span class="url-display">{{ item.url }}</span>
            <Button 
              class="open-external-btn"
              @click="openExternal"
            >
              <ExternalLink :size="14" />
              {{ t('workspace.openExternal') }}
            </Button>
          </div>
          <iframe 
            :src="item.url"
            class="webpage-iframe-fullview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-top-navigation"
            loading="lazy"
          ></iframe>
        </div>
        <div v-else class="placeholder-fullview">
          <Globe :size="64" />
          <h3>{{ t('workspace.noWebpageUrl') }}</h3>
          <p>{{ t('workspace.noWebpageUrlDesc') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { Button, Input } from 'ant-design-vue'
import { 
  Search, CheckCircle, FileText, Globe, Edit, X, ExternalLink
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const props = defineProps({
  item: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'update'])

const isEditing = ref(false)
const editingContent = ref('')
const contentContainer = ref(null)

const typeIcon = computed(() => {
  const icons = {
    research: Search,
    factcheck: CheckCircle,
    document: FileText,
    webpage: Globe
  }
  return icons[props.item.type] || FileText
})

const startEditing = () => {
  isEditing.value = true
  editingContent.value = props.item.content || ''
  nextTick(() => {
    const textarea = contentContainer.value?.querySelector('textarea')
    if (textarea) textarea.focus()
  })
}

const toggleEditing = () => {
  if (isEditing.value) {
    cancelEditing()
  } else {
    startEditing()
  }
}

const cancelEditing = () => {
  isEditing.value = false
  editingContent.value = props.item.content || ''
}

const saveContent = () => {
  emit('update', props.item.id, { content: editingContent.value })
  isEditing.value = false
}

const handleKeyDown = (e) => {
  if (e.key === 'Escape') {
    cancelEditing()
  } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    saveContent()
  }
}

const formatText = (text) => {
  return text.replace(/\n/g, '<br>')
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

// Handle escape key to close
const handleEscape = (e) => {
  if (e.key === 'Escape' && !isEditing.value) {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
})
</script>

<style scoped>
.canvas-item-fullview {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #ffffff;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
}

.fullview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e9ecef;
  background: #fafafa;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.type-badge {
  background: #f0f0f0;
  color: #666;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.edit-toggle-btn {
  display: flex;
  align-items: center;
  gap: 8px;
}

.edit-toggle-btn.active {
  background: #1890ff;
  color: white;
  border-color: #1890ff;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
}

.fullview-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

/* Research Styles */
.research-fullview {
  max-width: 1200px;
  margin: 0 auto;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e9ecef;
}

.results-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.results-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.result-count {
  font-size: 14px;
  color: #666;
}

.result-status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
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

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
}

.result-card {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  transition: all 0.2s ease;
}

.result-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.result-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
}

.result-relevance {
  background: #e6f4ff;
  color: #1890ff;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.result-snippet {
  color: #666;
  line-height: 1.6;
  margin-bottom: 12px;
}

.result-source a {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #1890ff;
  text-decoration: none;
  font-size: 14px;
}

.result-source a:hover {
  text-decoration: underline;
}

/* Fact Check Styles */
.factcheck-fullview {
  max-width: 900px;
  margin: 0 auto;
}

.verdict-section {
  margin-bottom: 32px;
}

.verdict-main {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
}

.verdict-badge {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 18px;
  font-weight: 600;
}

.verdict-badge.true,
.verdict-badge.likely_true {
  background: #f6ffed;
  border: 2px solid #b7eb8f;
  color: #52c41a;
}

.verdict-badge.false,
.verdict-badge.likely_false {
  background: #fff2f0;
  border: 2px solid #ffb3b3;
  color: #ff4d4f;
}

.verdict-badge.mixed,
.verdict-badge.uncertain {
  background: #fffbe6;
  border: 2px solid #ffe58f;
  color: #fa8c16;
}

.verdict-icon {
  font-size: 24px;
}

.confidence-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.confidence-bar {
  width: 200px;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff4d4f 0%, #fa8c16 50%, #52c41a 100%);
  transition: width 0.3s ease;
}

.confidence-text {
  font-size: 14px;
  color: #666;
}

.claim-section,
.analysis-section,
.evidence-section {
  margin-bottom: 32px;
}

.claim-section h3,
.analysis-section h3,
.evidence-section h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: #333;
  border-bottom: 2px solid #1890ff;
  padding-bottom: 8px;
}

.claim-text {
  background: #f0f7ff;
  border-left: 4px solid #1890ff;
  padding: 20px;
  margin: 0;
  font-style: italic;
  font-size: 16px;
  line-height: 1.6;
  border-radius: 0 8px 8px 0;
}

.analysis-content {
  line-height: 1.7;
  color: #333;
  font-size: 15px;
}

.evidence-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.evidence-item {
  background: #fafafa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
}

.evidence-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.evidence-type {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.evidence-type.supporting {
  background: #f6ffed;
  color: #52c41a;
}

.evidence-type.contradicting {
  background: #fff2f0;
  color: #ff4d4f;
}

.evidence-strength {
  font-size: 12px;
  color: #666;
  font-weight: 600;
}

.evidence-text {
  margin: 8px 0;
  line-height: 1.5;
}

.evidence-source {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #1890ff;
  text-decoration: none;
  font-size: 14px;
}

.evidence-source:hover {
  text-decoration: underline;
}

/* Document Styles */
.document-fullview {
  max-width: 800px;
  margin: 0 auto;
}

.document-textarea {
  font-size: 16px;
  line-height: 1.7;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  border: none;
  background: transparent;
  resize: none;
}

.document-textarea:focus {
  box-shadow: none;
  border-color: transparent;
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e9ecef;
}

.document-content {
  font-size: 16px;
  line-height: 1.7;
  color: #333;
}

/* Webpage Styles */
.webpage-fullview {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.url-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  font-size: 14px;
}

.url-display {
  flex: 1;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.open-external-btn {
  display: flex;
  align-items: center;
  gap: 6px;
}

.webpage-iframe-fullview {
  flex: 1;
  width: 100%;
  border: none;
  background: #fff;
}

/* Placeholder Styles */
.placeholder-fullview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 80px 40px;
  color: #999;
}

.placeholder-fullview h3 {
  margin: 20px 0 12px 0;
  font-size: 20px;
  color: #666;
}

.placeholder-fullview p {
  margin: 0 0 24px 0;
  font-size: 16px;
  max-width: 400px;
  line-height: 1.5;
}

/* Responsive Design */
@media (max-width: 768px) {
  .fullview-header {
    padding: 16px 20px;
  }
  
  .header-left h2 {
    font-size: 18px;
  }
  
  .fullview-content {
    padding: 20px;
  }
  
  .results-grid {
    grid-template-columns: 1fr;
  }
  
  .result-card {
    padding: 16px;
  }
  
  .verdict-main {
    padding: 20px;
  }
  
  .verdict-badge {
    font-size: 16px;
    padding: 12px 20px;
  }
}

/* Scrollbar Styling */
.fullview-content::-webkit-scrollbar {
  width: 8px;
}

.fullview-content::-webkit-scrollbar-track {
  background: #f8f9fa;
}

.fullview-content::-webkit-scrollbar-thumb {
  background: #d0d0d0;
  border-radius: 4px;
}

.fullview-content::-webkit-scrollbar-thumb:hover {
  background: #bbb;
}
</style>