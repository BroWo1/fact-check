<template>
  <div class="canvas-collection">
    <!-- Canvas Header -->
    <div class="canvas-header">
      <div class="header-left">
        <div class="workspace-title-container">
          <h2 
            v-if="!isEditingTitle" 
            class="workspace-title"
            @click="startEditingTitle"
            :title="'Click to edit workspace name'"
          >
            {{ workspace?.name || 'Untitled Workspace' }}
            <Edit :size="14" class="edit-icon" />
          </h2>
          <Input
            v-else
            v-model:value="editingTitleValue"
            @blur="saveTitle"
            @keydown.enter="saveTitle"
            @keydown.esc="cancelEditingTitle"
            class="title-input"
            ref="titleInputRef"
          />
        </div>
        <span class="item-count">{{ canvasItems.length }} items</span>
      </div>
      <div class="header-actions">
        <Dropdown>
          <template #overlay>
            <Menu @click="handleHeaderMenuClick">
              <MenuItem key="item">
                <FileText :size="16" />
                Add Item
              </MenuItem>
              <MenuItem key="pdf">
                <FileText :size="16" />
                Upload PDF
              </MenuItem>
            </Menu>
          </template>
          <Button type="primary" class="add-item-btn">
            <Plus :size="16" />
            Add Content
          </Button>
        </Dropdown>
      </div>
    </div>

    <div class="canvas-area" ref="canvasArea">
      <div v-if="canvasItems.length === 0" class="empty-canvas">
        <div class="empty-illustration">📋</div>
        <h4>{{ t('workspace.emptyCanvas') }}</h4>
        <p>{{ t('workspace.emptyCanvasDesc') }}</p>
        <Button type="primary" @click="showAddMenu = true">
          {{ t('workspace.addFirstItem') }}
        </Button>
      </div>

      <div class="canvas-container free-view">
        <CanvasItem
          v-for="item in canvasItems"
          :key="item.id"
          :item="item"
          :is-grid-view="false"
          @update="handleUpdateItem"
          @remove="handleRemoveItem"
          @focus="handleFocusItem"
          @enlarge="handleEnlargeItem"
        />
      </div>
    </div>

    <!-- Add Item Modal -->
    <Modal
      v-model:visible="showAddItemModal"
      :title="t('workspace.addNewItem')"
      :footer="null"
      width="500px"
    >
      <div class="add-item-form">
        <div class="item-type-selector">
          <div
            v-for="type in itemTypes"
            :key="type.key"
            class="type-option"
            :class="{ active: selectedType === type.key }"
            @click="selectedType = type.key"
          >
            <component :is="type.icon" :size="24" />
            <span>{{ type.label }}</span>
          </div>
        </div>

        <div class="form-section" v-if="selectedType">
          <Input
            v-model:value="newItemTitle"
            :placeholder="t('workspace.itemTitle')"
            class="title-input"
          />
          
          <!-- Research/Fact-check Analysis Selection -->
          <div v-if="selectedType === 'research' || selectedType === 'factcheck'" class="analysis-selection">
            <div class="selection-header">
              <span>{{ t('workspace.selectAnalysis') }}</span>
              <Button size="small" @click="refreshAnalyses">
                {{ t('workspace.refresh') }}
              </Button>
            </div>
            <div v-if="availableAnalyses.length === 0" class="no-analyses">
              <p>{{ t('workspace.noSavedAnalyses') }}</p>
            </div>
            <div v-else class="analyses-list">
              <div
                v-for="analysis in filteredAnalyses"
                :key="analysis.id"
                class="analysis-option"
                :class="{ selected: selectedAnalysisId === analysis.id }"
                @click="selectAnalysis(analysis.id)"
              >
                <div class="analysis-info">
                  <div class="analysis-title">{{ getAnalysisTitle(analysis) }}</div>
                  <div class="analysis-meta">
                    <span class="analysis-type">{{ analysis.mode || 'fact_check' }}</span>
                    <span class="analysis-date">{{ formatDate(analysis.timestamp) }}</span>
                  </div>
                </div>
                <div class="analysis-preview">
                  <span v-if="analysis.verdict" class="verdict-indicator" :class="analysis.verdict">
                    {{ getVerdictIcon(analysis.verdict) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div v-if="selectedType === 'document'" class="document-input-section">
            <div class="document-tabs">
              <Button 
                :type="documentInputMode === 'text' ? 'primary' : 'default'"
                @click="documentInputMode = 'text'"
                size="small"
              >
                {{ t('workspace.writeText') }}
              </Button>
              <Button 
                :type="documentInputMode === 'upload' ? 'primary' : 'default'"
                @click="documentInputMode = 'upload'"
                size="small"
              >
                {{ t('workspace.uploadDOCX') }}
              </Button>
            </div>
            
            <Input.TextArea
              v-if="documentInputMode === 'text'"
              v-model:value="newItemContent"
              :placeholder="t('workspace.itemContent')"
              :rows="4"
              class="content-input"
            />
            
            <div v-else class="docx-upload-area">
              <input
                ref="docxFileInput"
                type="file"
                accept=".docx,.doc"
                @change="handleDOCXSelect"
                class="hidden-file-input"
              />
              <div 
                v-if="!selectedDOCXFile"
                class="upload-zone-small"
                @click="docxFileInput?.click()"
              >
                <FileText :size="24" />
                <span>{{ t('workspace.selectDOCXFile') }}</span>
              </div>
              <div v-else class="selected-file-info">
                <FileText :size="16" />
                <span class="filename">{{ selectedDOCXFile.name }}</span>
                <Button size="small" @click="removeDOCXFile">
                  {{ t('workspace.remove') }}
                </Button>
              </div>
            </div>
          </div>
          
          <Input
            v-if="selectedType === 'webpage'"
            v-model:value="newItemUrl"
            :placeholder="t('workspace.webpageUrl')"
            class="url-input"
          />
        </div>

        <div class="modal-actions">
          <Button @click="showAddItemModal = false">
            {{ t('common.cancel') }}
          </Button>
          <Button 
            type="primary" 
            @click="createItem"
            :disabled="!canCreateItem"
          >
            {{ t('workspace.create') }}
          </Button>
        </div>
      </div>
    </Modal>

    <!-- Document Upload Modal -->
    <Modal
      v-model:visible="showDocumentUpload"
      :title="null"
      :footer="null"
      width="600px"
      class="document-upload-modal"
    >
      <DocumentUpload 
        :workspace="workspace"
        @close="showDocumentUpload = false"
        @upload-success="handleDocumentUploadSuccess"
        @add-to-canvas="handleAddCanvasItem"
      />
    </Modal>

    <!-- PDF Upload Modal -->
    <Modal
      v-model:visible="showPDFUpload"
      :title="null"
      :footer="null"
      width="600px"
      class="pdf-upload-modal"
    >
      <PDFUpload 
        :workspace="workspace"
        @close="showPDFUpload = false"
        @upload-success="handlePDFUploadSuccess"
        @add-to-canvas="handleAddCanvasItem"
      />
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { Button, Dropdown, Menu, MenuItem, Modal, Input } from 'ant-design-vue'
import { Plus, Search, CheckCircle, FileText, Globe, Eye, Edit } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import CanvasItem from './CanvasItem.vue'
import DocumentUpload from './DocumentUpload.vue'
import PDFUpload from './PDFUpload.vue'
import { useSavedAnalyses } from '../../composables/useSavedAnalyses'
import mammoth from 'mammoth/mammoth.browser'

const { t } = useI18n()
const props = defineProps({
  workspace: Object
})

const emit = defineEmits(['add-canvas', 'remove-canvas', 'update-canvas', 'enlarge-item', 'update-workspace-name'])

const showAddItemModal = ref(false)
const showDocumentUpload = ref(false)
const showPDFUpload = ref(false)
const selectedType = ref('')
const newItemTitle = ref('')
const newItemContent = ref('')
const newItemUrl = ref('')
const canvasArea = ref(null)
const selectedAnalysisId = ref('')
const documentInputMode = ref('text')
const selectedDOCXFile = ref(null)
const docxFileInput = ref(null)

// Title editing state
const isEditingTitle = ref(false)
const editingTitleValue = ref('')
const titleInputRef = ref(null)

const { 
  savedAnalyses: availableAnalyses,
  getVerdictIcon,
  getVerdictColor
} = useSavedAnalyses()

const canvasItems = computed(() => props.workspace?.canvasItems || [])

const itemTypes = computed(() => [
  { key: 'research', label: t('workspace.research'), icon: Search },
  { key: 'factcheck', label: t('workspace.factCheck'), icon: CheckCircle },
  { key: 'document', label: t('workspace.document'), icon: FileText },
  { key: 'webpage', label: t('workspace.webpage'), icon: Globe }
])

const filteredAnalyses = computed(() => {
  if (!selectedType.value) return []
  
  return availableAnalyses.value.filter(analysis => {
    if (selectedType.value === 'research') {
      return analysis.mode === 'research'
    } else if (selectedType.value === 'factcheck') {
      return analysis.mode === 'fact_check' || !analysis.mode // default to fact_check
    }
    return false
  }).slice(0, 10) // Show max 10 recent analyses
})

const canCreateItem = computed(() => {
  if (!selectedType.value || !newItemTitle.value.trim()) return false
  
  if (selectedType.value === 'webpage') {
    return newItemUrl.value.trim().length > 0
  }
  
  if (selectedType.value === 'research' || selectedType.value === 'factcheck') {
    return selectedAnalysisId.value.length > 0
  }
  
  return true
})

const handleAddItem = ({ key }) => {
  if (key === 'document') {
    selectedType.value = key
    showAddItemModal.value = true
    resetForm()
  } else if (key === 'pdf') {
    showPDFUpload.value = true
  } else {
    selectedType.value = key
    showAddItemModal.value = true
    resetForm()
  }
}

const createItem = async () => {
  // Calculate the highest z-index for new items
  const maxZIndex = Math.max(...canvasItems.value.map(item => item.zIndex || 1), 1)
  
  let content = newItemContent.value || ''
  
  // Handle DOCX file conversion for document type
  if (selectedType.value === 'document' && documentInputMode.value === 'upload' && selectedDOCXFile.value) {
    content = await convertDOCXToMarkdown(selectedDOCXFile.value)
  }
  
  let itemData = {
    type: selectedType.value,
    title: newItemTitle.value.trim(),
    content: content,
    url: newItemUrl.value || '',
    status: 'draft',
    zIndex: maxZIndex + 1,
    position: { x: 50 + (canvasItems.value.length * 20), y: 50 + (canvasItems.value.length * 20) },
    size: { width: 400, height: 500 }
  }

  // If it's a research or fact-check item, attach the selected analysis data
  if ((selectedType.value === 'research' || selectedType.value === 'factcheck') && selectedAnalysisId.value) {
    const selectedAnalysis = availableAnalyses.value.find(a => a.id === selectedAnalysisId.value)
    if (selectedAnalysis) {
      itemData = {
        ...itemData,
        analysisId: selectedAnalysis.id,
        claim: selectedAnalysis.originalClaim || selectedAnalysis.claim,
        verdict: selectedAnalysis.results?.verdict || selectedAnalysis.verdict,
        confidence: selectedAnalysis.results?.confidence_score ? Math.round(selectedAnalysis.results.confidence_score * 100) : selectedAnalysis.confidence,
        analysis: selectedAnalysis.results?.reasoning || selectedAnalysis.results?.analysis || selectedAnalysis.results?.summary || selectedAnalysis.analysis || selectedAnalysis.summary,
        evidence: selectedAnalysis.results?.evidence || selectedAnalysis.evidence,
        sources: selectedAnalysis.results?.sources || selectedAnalysis.sources,
        limitations: selectedAnalysis.results?.limitations || selectedAnalysis.limitations || [],
        recommendations: selectedAnalysis.results?.recommendations || selectedAnalysis.recommendations || [],
        results: (() => {
          // Handle different result structures
          let sourceResults = []
          
          // First try to get results from selectedAnalysis.results.sources (for research mode)
          if (selectedAnalysis.results?.sources && Array.isArray(selectedAnalysis.results.sources)) {
            sourceResults = selectedAnalysis.results.sources
          }
          // Then try selectedAnalysis.sources (for older format)
          else if (selectedAnalysis.sources && Array.isArray(selectedAnalysis.sources)) {
            sourceResults = selectedAnalysis.sources
          }
          // Finally try selectedAnalysis.results.evidence (for fact-check mode)
          else if (selectedAnalysis.results?.evidence && Array.isArray(selectedAnalysis.results.evidence)) {
            sourceResults = selectedAnalysis.results.evidence
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
        timestamp: selectedAnalysis.timestamp,
        status: 'completed'
      }
    }
  }

  emit('add-canvas', itemData)
  showAddItemModal.value = false
  resetForm()
}

const selectAnalysis = (analysisId) => {
  selectedAnalysisId.value = analysisId
}

const refreshAnalyses = () => {
  // The saved analyses are already reactive, but this can force a refresh if needed
  console.log('Refreshing analyses list...')
}

const getAnalysisTitle = (analysis) => {
  return analysis.claim || analysis.title || 'Untitled Analysis'
}

const formatDate = (timestamp) => {
  return new Date(timestamp).toLocaleDateString()
}

const handleDOCXSelect = (event) => {
  const file = event.target.files[0]
  if (file && validateDOCXFile(file)) {
    selectedDOCXFile.value = file
    if (!newItemTitle.value.trim()) {
      newItemTitle.value = file.name.replace(/\.[^/.]+$/, "")
    }
  }
  event.target.value = ''
}

const validateDOCXFile = (file) => {
  const maxSize = 25 * 1024 * 1024 // 25MB
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ]
  
  if (!allowedTypes.includes(file.type)) {
    Modal.error({
      title: 'Invalid File Type',
      content: t('workspace.invalidDOCXFileType')
    })
    return false
  }
  
  if (file.size > maxSize) {
    Modal.error({
      title: 'File Too Large',
      content: t('workspace.fileTooLarge')
    })
    return false
  }
  
  return true
}

const removeDOCXFile = () => {
  selectedDOCXFile.value = null
}

const convertDOCXToMarkdown = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const { value } = await mammoth.extractRawText({ arrayBuffer })
    let text = value || ''
    text = text.replace(/\r/g, '')
    text = text.split('\u000b').join('\n')
    return text.trim() || `# ${file.name.replace(/\.[^/.]+$/, '')}`
  } catch (error) {
    console.error('Error converting DOCX to text:', error)
    return `# ${file.name}\n\nError converting document: ${error.message}`
  }
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const resetForm = () => {
  newItemTitle.value = ''
  newItemContent.value = ''
  newItemUrl.value = ''
  selectedAnalysisId.value = ''
  documentInputMode.value = 'text'
  selectedDOCXFile.value = null
}

const handleUpdateItem = (itemId, updates) => {
  emit('update-canvas', itemId, updates)
}

const handleRemoveItem = (itemId) => {
  emit('remove-canvas', itemId)
}

const handleFocusItem = (itemId) => {
  console.log('Focus item:', itemId)
  // Move the focused item to the top by updating its z-index
  const maxZIndex = Math.max(...canvasItems.value.map(item => item.zIndex || 1), 1)
  emit('update-canvas', itemId, { zIndex: maxZIndex + 1 })
}


const getItemIcon = (type) => {
  const icons = {
    research: Search,
    factcheck: CheckCircle,
    document: FileText,
    pdf: FileText,
    webpage: Globe
  }
  return icons[type] || FileText
}

const handleViewItem = ({ key, domEvent }) => {
  const itemId = domEvent.target.closest('[data-item-id]')?.getAttribute('data-item-id')
  if (itemId) {
    const item = canvasItems.value.find(item => item.id === itemId)
    if (item) {
      emit('enlarge-item', item)
    }
  }
}

const handleEnlargeItem = (item) => {
  emit('enlarge-item', item)
}

const handleDocumentUploadSuccess = (uploadData) => {
  console.log('Document uploaded successfully:', uploadData)
  // Handle successful upload if needed (e.g., show notification)
}

const handlePDFUploadSuccess = (uploadData) => {
  console.log('PDF uploaded successfully:', uploadData)
  // Handle successful upload if needed (e.g., show notification)
}

const handleAddCanvasItem = (documentData) => {
  // Calculate the highest z-index for new items
  const maxZIndex = Math.max(...canvasItems.value.map(item => item.zIndex || 1), 1)
  
  // Create new canvas item with uploaded document data
  const newItem = {
    id: Date.now().toString(),
    ...documentData,
    zIndex: maxZIndex + 1,
    createdAt: Date.now()
  }
  
  emit('add-canvas', newItem)
  showDocumentUpload.value = false
}

// Title editing functions
const startEditingTitle = () => {
  isEditingTitle.value = true
  editingTitleValue.value = props.workspace?.name || 'Untitled Workspace'
  nextTick(() => {
    titleInputRef.value?.focus()
    titleInputRef.value?.select()
  })
}

const saveTitle = () => {
  if (editingTitleValue.value.trim()) {
    // Update the workspace name through the parent component
    emit('update-workspace-name', editingTitleValue.value.trim())
  }
  isEditingTitle.value = false
}

const cancelEditingTitle = () => {
  isEditingTitle.value = false
  editingTitleValue.value = ''
}

const handleHeaderMenuClick = ({ key }) => {
  if (key === 'item') {
    showAddItemModal.value = true
  } else if (key === 'pdf') {
    showPDFUpload.value = true
  }
}
</script>

<style scoped>
.canvas-collection {
  height: 100%;
  display: flex;
  flex-direction: column;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
}

.canvas-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #ffffff;
  border-bottom: 1px solid #e9ecef;
  flex-shrink: 0;
  min-height: 68px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.workspace-title-container {
  flex: 1;
  min-width: 0;
}

.workspace-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.workspace-title:hover {
  background: #f5f5f5;
}

.edit-icon {
  opacity: 0;
  transition: opacity 0.2s ease;
  flex-shrink: 0;
}

.workspace-title:hover .edit-icon {
  opacity: 0.6;
}

.title-input {
  font-size: 18px;
  font-weight: 600;
  border: 2px solid #1890ff;
  border-radius: 4px;
  padding: 4px 8px;
}

.item-count {
  font-size: 12px;
  color: #999;
  background: #f5f5f5;
  padding: 4px 8px;
  border-radius: 12px;
  font-weight: 500;
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.add-item-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 16px;
  border-radius: 6px;
  font-weight: 500;
}



.canvas-area {
  flex: 1;
  overflow: auto;
  background: #fafafa;
}

.empty-canvas {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 40px;
}

.empty-illustration {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-canvas h4 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #333;
}

.empty-canvas p {
  margin: 0 0 24px 0;
  color: #666;
  max-width: 300px;
  line-height: 1.5;
}

.canvas-container {
  padding: 20px;
  min-height: 100%;
}


.canvas-container.free-view {
  position: relative;
  height: 100vh;
}

.add-item-form {
  padding: 20px 0;
}

.item-type-selector {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.type-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  gap: 8px;
}

.type-option:hover {
  border-color: #1890ff;
  background: #f0f7ff;
}

.type-option.active {
  border-color: #1890ff;
  background: #e6f4ff;
  color: #1890ff;
}

.type-option span {
  font-size: 14px;
  font-weight: 500;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.title-input,
.content-input,
.url-input {
  border-radius: 6px;
}

.analysis-selection {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  background: #fafafa;
}

.selection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 600;
  color: #333;
}

.no-analyses {
  text-align: center;
  padding: 20px;
  color: #666;
}

.no-analyses p {
  margin: 0;
  font-size: 14px;
}

.analyses-list {
  max-height: 200px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.analysis-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #fff;
}

.analysis-option:hover {
  border-color: #1890ff;
  background: #f0f7ff;
}

.analysis-option.selected {
  border-color: #1890ff;
  background: #e6f4ff;
}

.analysis-info {
  flex: 1;
  min-width: 0;
}

.analysis-title {
  font-weight: 600;
  color: #333;
  font-size: 14px;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.analysis-meta {
  display: flex;
  gap: 12px;
  align-items: center;
}

.analysis-type {
  font-size: 11px;
  color: #666;
  text-transform: uppercase;
  font-weight: 600;
  background: #f0f0f0;
  padding: 2px 8px;
  border-radius: 10px;
}

.analysis-date {
  font-size: 12px;
  color: #999;
}

.analysis-preview {
  display: flex;
  align-items: center;
  margin-left: 12px;
}

.verdict-indicator {
  font-size: 16px;
  padding: 4px;
  border-radius: 4px;
}

.verdict-indicator.true,
.verdict-indicator.likely_true {
  background: #f6ffed;
}

.verdict-indicator.false,
.verdict-indicator.likely_false {
  background: #fff2f0;
}

.verdict-indicator.mixed,
.verdict-indicator.uncertain {
  background: #fffbe6;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

/* Menu styling */
:deep(.ant-dropdown-menu) {
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

:deep(.ant-dropdown-menu-item) {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
}

:deep(.ant-dropdown-menu-item:hover) {
  background: #f0f7ff;
}

/* Items menu styling */
:deep(.items-menu .ant-dropdown-menu-item) {
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 280px;
}

.item-title {
  flex: 1;
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-type {
  font-size: 11px;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
}

@media (max-width: 768px) {
  .canvas-header {
    padding: 12px 16px;
    min-height: 56px;
  }
  
  .workspace-title {
    font-size: 16px;
  }
  
  .title-input {
    font-size: 16px;
  }
  
  .item-count {
    font-size: 11px;
  }
  
  .add-item-btn {
    height: 32px;
    padding: 0 12px;
    font-size: 14px;
  }
  
  .item-type-selector {
    grid-template-columns: 1fr;
  }
  
  .type-option {
    flex-direction: row;
    justify-content: flex-start;
    text-align: left;
  }
}

/* Document Upload Modal Styling */
:deep(.document-upload-modal .ant-modal-body) {
  padding: 0;
}

:deep(.document-upload-modal .ant-modal-header) {
  display: none;
}

:deep(.document-upload-modal .ant-modal-content) {
  border-radius: 8px;
  overflow: hidden;
}

/* PDF Upload Modal Styling */
:deep(.pdf-upload-modal .ant-modal-body) {
  padding: 0;
}

:deep(.pdf-upload-modal .ant-modal-header) {
  display: none;
}

:deep(.pdf-upload-modal .ant-modal-content) {
  border-radius: 8px;
  overflow: hidden;
}

/* Document input section styling */
.document-input-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.document-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.docx-upload-area {
  padding: 16px;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  background: #fafafa;
}

.hidden-file-input {
  display: none;
}

.upload-zone-small {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  border: 2px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  gap: 12px;
  color: #666;
}

.upload-zone-small:hover {
  border-color: #1890ff;
  background: #f0f7ff;
  color: #1890ff;
}

.selected-file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #fff;
  border: 1px solid #e9ecef;
  border-radius: 4px;
}

.selected-file-info .filename {
  flex: 1;
  font-weight: 500;
  color: #333;
}
</style>