<template>
  <div class="document-upload">
    <div class="upload-header">
      <h3>{{ t('workspace.addDocument') }}</h3>
      <Button 
        class="close-btn"
        size="small"
        @click="$emit('close')"
      >
        <X :size="16" />
      </Button>
    </div>

    <div class="upload-content">
      <div v-if="!selectedFile" class="upload-zone" @click="triggerFileInput">
        <input
          ref="fileInput"
          type="file"
          accept=".pdf,.docx,.doc"
          @change="handleFileSelect"
          class="hidden-file-input"
        />
        <div class="upload-icon">
          <Upload :size="48" />
        </div>
        <h4>{{ t('workspace.uploadDocument') }}</h4>
        <p>{{ t('workspace.uploadDocumentDesc') }}</p>
        <div class="supported-formats">
          <span class="format-tag">PDF</span>
          <span class="format-tag">DOCX</span>
          <span class="format-tag">DOC</span>
        </div>
        <Button type="primary" class="browse-btn">
          <FileText :size="16" />
          {{ t('workspace.browseFiles') }}
        </Button>
      </div>

      <div v-else class="file-preview">
        <div class="file-info">
          <div class="file-icon">
            <FileText :size="24" />
          </div>
          <div class="file-details">
            <div class="file-name">{{ selectedFile.name }}</div>
            <div class="file-size">{{ formatFileSize(selectedFile.size) }}</div>
            <div class="file-type">{{ getFileType(selectedFile.name) }}</div>
          </div>
          <Button
            class="remove-file-btn"
            size="small"
            @click="removeFile"
          >
            <Trash2 :size="14" />
          </Button>
        </div>

        <div class="file-actions">
          <div class="document-title-input">
            <label>{{ t('workspace.documentTitle') }}:</label>
            <Input 
              v-model:value="documentTitle"
              :placeholder="t('workspace.documentTitlePlaceholder')"
              class="title-input"
            />
          </div>

          <div class="upload-options">
            <div class="option-item">
              <Checkbox v-model:checked="addToCanvas">
                {{ t('workspace.addToCanvas') }}
              </Checkbox>
            </div>
          </div>

          <div class="action-buttons">
            <Button 
              @click="removeFile"
              class="cancel-btn"
            >
              {{ t('workspace.cancel') }}
            </Button>
            <Button
              type="primary"
              @click="uploadDocument"
              :loading="isUploading"
              :disabled="!documentTitle.trim()"
            >
              <Upload :size="16" />
              {{ t('workspace.uploadFile') }}
            </Button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isUploading" class="upload-progress">
      <div class="progress-info">
        <span>{{ t('workspace.uploading') }}...</span>
        <span>{{ uploadProgress }}%</span>
      </div>
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: `${uploadProgress}%` }"
        ></div>
      </div>
    </div>

    <div v-if="uploadError" class="upload-error">
      <div class="error-icon">
        <AlertCircle :size="16" />
      </div>
      <span>{{ uploadError }}</span>
      <Button
        class="retry-btn"
        size="small"
        @click="retryUpload"
      >
        {{ t('workspace.retry') }}
      </Button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Button, Input, Checkbox } from 'ant-design-vue'
import { 
  Upload, FileText, X, Trash2, AlertCircle
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
// Use the browser build of mammoth for client-side DOCX parsing
import mammoth from 'mammoth/mammoth.browser'

const { t } = useI18n()
const props = defineProps({
  workspace: Object
})

const emit = defineEmits(['close', 'upload-success', 'add-to-canvas'])

const fileInput = ref(null)
const selectedFile = ref(null)
const documentTitle = ref('')
const addToCanvas = ref(true)
const isUploading = ref(false)
const uploadProgress = ref(0)
const uploadError = ref('')

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file && validateFile(file)) {
    selectedFile.value = file
    documentTitle.value = file.name.replace(/\.[^/.]+$/, "")
    uploadError.value = ''
  }
  // Reset input to allow selecting same file again
  event.target.value = ''
}

const validateFile = (file) => {
  const maxSize = 50 * 1024 * 1024 // 50MB
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ]
  
  if (!allowedTypes.includes(file.type)) {
    uploadError.value = t('workspace.invalidFileType')
    return false
  }
  
  if (file.size > maxSize) {
    uploadError.value = t('workspace.fileTooLarge')
    return false
  }
  
  return true
}

const removeFile = () => {
  selectedFile.value = null
  documentTitle.value = ''
  uploadError.value = ''
  uploadProgress.value = 0
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getFileType = (filename) => {
  const extension = filename.split('.').pop().toUpperCase()
  return extension
}

const uploadDocument = async () => {
  if (!selectedFile.value || !documentTitle.value.trim()) return
  
  isUploading.value = true
  uploadProgress.value = 0
  uploadError.value = ''
  
  try {
    // Simulate upload progress
    const progressInterval = setInterval(() => {
      uploadProgress.value += Math.random() * 30
      if (uploadProgress.value >= 95) {
        clearInterval(progressInterval)
      }
    }, 200)
    
    // Create FormData for file upload
    const formData = new FormData()
    formData.append('document', selectedFile.value)
    formData.append('title', documentTitle.value)
    
    // In a real implementation, this would be an actual API call
    await simulateUpload()
    
    clearInterval(progressInterval)
    uploadProgress.value = 100
    
    // Create document object for canvas if needed
    if (addToCanvas.value) {
      const fileType = getFileType(selectedFile.value.name)
      const isPDF = fileType === 'PDF'
      const isDOCX = selectedFile.value.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      
      // Create a data URL for the file if it's a PDF
      let fileUrl = null
      if (isPDF) {
        const dataUrl = await readFileAsDataURL(selectedFile.value)
        fileUrl = dataUrl
        // Persist data URL to survive reloads
        // Note: large PDFs may exceed localStorage limits
      }
      
      // Extract text content from DOCX for document items
      let extractedContent = ''
      if (!isPDF && isDOCX) {
        try {
          extractedContent = await convertDOCXToText(selectedFile.value)
        } catch (e) {
          console.warn('DOCX conversion failed, falling back to placeholder:', e)
        }
      }
      
      const documentData = {
        type: isPDF ? 'pdf' : 'document',
        title: documentTitle.value,
        content: isPDF ? '' : (extractedContent || t('workspace.documentContent')),
        filename: selectedFile.value.name,
        fileSize: selectedFile.value.size,
        fileType: fileType,
        fileUrl: fileUrl,
        fileDataUrl: fileUrl,
        createdAt: Date.now(),
        position: { x: 100, y: 100 },
        size: { width: 500, height: 600 }
      }
      
      emit('add-to-canvas', documentData)
    }
    
    emit('upload-success', {
      file: selectedFile.value,
      title: documentTitle.value
    })
    
    // Reset form
    setTimeout(() => {
      removeFile()
      emit('close')
    }, 1000)
    
  } catch (error) {
    uploadError.value = error.message || t('workspace.uploadFailed')
    uploadProgress.value = 0
  } finally {
    isUploading.value = false
  }
}

// Convert DOCX file to plain text using mammoth
const convertDOCXToText = async (file) => {
  const arrayBuffer = await file.arrayBuffer()
  const { value } = await mammoth.extractRawText({ arrayBuffer })
  let text = value || ''
  text = text.replace(/\r/g, '')
  text = text.split('\u000b').join('\n')
  return text.trim()
}

const readFileAsDataURL = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const simulateUpload = async () => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // Simulate occasional upload failure for testing
  if (Math.random() < 0.1) {
    throw new Error(t('workspace.uploadFailed'))
  }
  
  return { success: true }
}

const retryUpload = () => {
  uploadError.value = ''
  uploadDocument()
}
</script>

<style scoped>
.document-upload {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.upload-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
}

.upload-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  border: none;
  background: none;
  color: #666;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: #e9ecef;
  color: #333;
}

.upload-content {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.upload-zone {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  padding: 40px 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.upload-zone:hover {
  border-color: #1890ff;
  background: #f0f7ff;
}

.hidden-file-input {
  display: none;
}

.upload-icon {
  color: #1890ff;
  margin-bottom: 16px;
}

.upload-zone h4 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.upload-zone p {
  margin: 0 0 20px 0;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
}

.supported-formats {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}

.format-tag {
  display: inline-block;
  padding: 4px 8px;
  background: #f0f7ff;
  color: #1890ff;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.browse-btn {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 24px;
}

.file-icon {
  width: 48px;
  height: 48px;
  background: #1890ff;
  color: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.file-details {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
  word-break: break-all;
}

.file-size {
  font-size: 12px;
  color: #666;
  margin-bottom: 2px;
}

.file-type {
  font-size: 12px;
  color: #1890ff;
  font-weight: 600;
}

.remove-file-btn {
  border: none;
  background: none;
  color: #ff4d4f;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.remove-file-btn:hover {
  background: #fff2f0;
  color: #ff4d4f;
}

.file-actions {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.document-title-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.document-title-input label {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.title-input {
  font-size: 14px;
}

.upload-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
}

.option-item {
  display: flex;
  align-items: center;
}

.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.cancel-btn {
  background: #f5f5f5;
  border-color: #d9d9d9;
  color: #666;
}

.cancel-btn:hover {
  background: #e6e6e6;
  border-color: #999;
  color: #333;
}

.upload-progress {
  padding: 16px 20px;
  border-top: 1px solid #e9ecef;
  background: #f8f9fa;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  color: #666;
}

.progress-bar {
  height: 4px;
  background: #e9ecef;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #1890ff;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.upload-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #fff2f0;
  border-top: 1px solid #ffccc7;
  color: #ff4d4f;
  font-size: 12px;
}

.error-icon {
  flex-shrink: 0;
}

.retry-btn {
  margin-left: auto;
  background: #ff4d4f;
  border-color: #ff4d4f;
  color: white;
  font-size: 11px;
}

.retry-btn:hover {
  background: #ff7875;
  border-color: #ff7875;
}
</style>