<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { Input, Button, Typography, Space, Layout, Upload, notification } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { useFactCheck } from './composables/useFactCheck'
import { useSavedAnalyses } from './composables/useSavedAnalyses'
import AnalysisProgress from './components/Progress2.vue'
import FactCheckResults from './components/FactCheckResults.vue'
import ResearchResults from './components/ResearchResults.vue'
import LanguageSelector from './components/LanguageSelector.vue'
import SavedAnalysesDropdown from './components/SavedAnalysesDropdown.vue'
import ModeSelector from './components/ModeSelector.vue'

const { Title, Paragraph } = Typography
const { Header, Content } = Layout
const { t, locale } = useI18n()

// Watch for locale changes to set document language
watch(locale, (newLocale) => {
  document.documentElement.lang = newLocale === 'zh' ? 'zh-CN' : 'en'
}, { immediate: true })

// Original state
const inputText = ref('')
const currentExampleIndex = ref(0)
const uploadedFile = ref(null)
const imagePreview = ref('')
const isDragOver = ref(false)
const isMobileMenuOpen = ref(false)
const headerActionsRef = ref(null)
const selectedMode = ref('fact_check')

// Watch for mode changes to update document title
watch(selectedMode, (newMode) => {
  document.title = newMode === 'fact_check' ? t('app.title') : t('app.researchTitle')
}, { immediate: true })

// Fact-check integration
const { 
  isLoading, 
  sessionId, 
  error, 
  results, 
  originalClaim,
  progress, 
  isConnected,
  usePolling,
  currentMode,
  startFactCheck,
  cancelFactCheck,
  resetState
} = useFactCheck()

// Saved analyses integration
const { saveAnalysis, savedAnalyses } = useSavedAnalyses()

const examples = ref([
  "New study shows that drinking 8 glasses of water daily can boost brain function by 30%",
  "Breaking: Scientists discover that chocolate consumption reduces risk of heart disease by 40%",
  "Report claims that electric vehicles produce more emissions than gas cars when accounting for battery production",
  "Social media post: 'Vaccines contain microchips for government tracking'",
  "News headline: Artificial intelligence will replace 50% of jobs by 2030"
])

const researchExamples = ref([
  "What are the latest developments in renewable energy technology?",
  "How does artificial intelligence impact modern healthcare?",
  "What are the economic effects of remote work on cities?",
  "How do electric vehicles compare to traditional cars in terms of environmental impact?",
  "What are the health benefits and risks of the Mediterranean diet?"
])

const currentExample = ref(examples.value[0])
let rotationInterval = null

const rotateExample = () => {
  const activeExamples = selectedMode.value === 'fact_check' ? examples.value : researchExamples.value
  currentExampleIndex.value = (currentExampleIndex.value + 1) % activeExamples.length
  currentExample.value = activeExamples[currentExampleIndex.value]
}

// Track if we're currently loading a saved analysis to prevent clearing results
const isLoadingSavedAnalysis = ref(false)

// Watch for mode changes to reset examples and clear results
watch(selectedMode, (newMode) => {
  const activeExamples = newMode === 'fact_check' ? examples.value : researchExamples.value
  currentExampleIndex.value = 0
  currentExample.value = activeExamples[0]
  
  // Clear results when switching modes but keep input text
  // Only clear if we're not currently loading a saved analysis
  if (results.value && !isLoadingSavedAnalysis.value) {
    results.value = null
    originalClaim.value = null
    uploadedFile.value = null
    imagePreview.value = ''
  }
})

const handleClickOutside = (event) => {
  if (isMobileMenuOpen.value && headerActionsRef.value && !headerActionsRef.value.contains(event.target)) {
    isMobileMenuOpen.value = false;
  }
};

onMounted(() => {
  rotationInterval = setInterval(rotateExample, 4000) // Rotate every 4 seconds
  document.addEventListener('click', handleClickOutside);
})

onUnmounted(() => {
  if (rotationInterval) {
    clearInterval(rotationInterval)
  }
  document.removeEventListener('click', handleClickOutside);
})

const selectExample = (example) => {
  inputText.value = example
}

const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (file && file.type.startsWith('image/')) {
    uploadedFile.value = file
    
    // Create image preview
    const reader = new FileReader()
    reader.onload = (e) => {
      imagePreview.value = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

const processImageFile = (file) => {
  if (file && file.type.startsWith('image/')) {
    uploadedFile.value = file
    
    // Create image preview
    const reader = new FileReader()
    reader.onload = (e) => {
      imagePreview.value = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

const handleDragOver = (e) => {
  e.preventDefault()
  isDragOver.value = true
}

const handleDragLeave = (e) => {
  e.preventDefault()
  isDragOver.value = false
}

const handleDrop = (e) => {
  e.preventDefault()
  isDragOver.value = false
  
  const files = e.dataTransfer.files
  if (files.length > 0) {
    const file = files[0]
    processImageFile(file)
  }
}

const handlePaste = (e) => {
  const items = e.clipboardData.items
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.type.startsWith('image/')) {
      e.preventDefault()
      const file = item.getAsFile()
      processImageFile(file)
      break
    }
  }
}

const removeImage = () => {
  uploadedFile.value = null
  imagePreview.value = ''
  // Reset file input
  const fileInput = document.getElementById('photo-upload')
  if (fileInput) fileInput.value = ''
}

const triggerFileUpload = () => {
  document.getElementById('photo-upload').click()
}

const analysisProgressRef = ref(null)

const handleSubmit = async () => {
  if (!inputText.value.trim() && !uploadedFile.value) return
  try {
    resetState()
    await startFactCheck(inputText.value, uploadedFile.value, selectedMode.value)
    notification.success({
      message: selectedMode.value === 'fact_check' ? 'Analysis Started' : 'Research Started',
      description: selectedMode.value === 'fact_check' 
        ? 'Your fact-check analysis has begun. You\'ll see real-time progress updates.'
        : 'Your research has begun. You\'ll see real-time progress updates.',
      duration: 3
    })
    await nextTick()
    if (analysisProgressRef.value) {
      analysisProgressRef.value.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  } catch (err) {
    console.error('Error starting fact-check:', err)
    notification.error({
      message: 'Error',
      description: err.message || 'Failed to start fact-check analysis',
      duration: 5
    })
  }
}

// Watch for errors and show notifications
watch(error, (newError) => {
  if (newError) {
    notification.error({
      message: 'Analysis Error',
      description: newError,
      duration: 5
    })
  }
})

// Watch for completed results and auto-save
watch(results, (newResults) => {
  if (newResults && originalClaim.value) {
    const normalizedClaim = originalClaim.value.trim().toLowerCase()
    const isUpdate = savedAnalyses.value.some(
      (analysis) => analysis.originalClaim.trim().toLowerCase() === normalizedClaim
    )

    // Auto-save the analysis (this will now handle update-or-create)
    saveAnalysis(newResults, originalClaim.value, selectedMode.value)
    
    if (isUpdate) {
      notification.info({
        message: 'Analysis Updated',
        description: 'An existing saved analysis has been updated with the new results.',
        duration: 3
      })
    } else {
      notification.success({
        message: selectedMode.value === 'fact_check' ? 'Analysis Saved' : 'Research Saved',
        description: selectedMode.value === 'fact_check' 
          ? 'Your analysis has been automatically saved to your history.'
          : 'Your research has been automatically saved to your history.',
        duration: 3
      })
    }
  }
})

const handleCancel = () => {
  cancelFactCheck()
  notification.info({
    message: selectedMode.value === 'fact_check' ? 'Analysis Cancelled' : 'Research Cancelled',
    description: selectedMode.value === 'fact_check' 
      ? 'The fact-check analysis has been cancelled.'
      : 'The research has been cancelled.',
    duration: 3
  })
}

const handleNewAnalysis = () => {
  resetState()
  inputText.value = ''
  uploadedFile.value = null
  imagePreview.value = ''
  // Keep the same mode, don't reset it
}

const handleLogoClick = () => {
  handleNewAnalysis()
  // Scroll to top smoothly
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const toggleMobileMenu = () => {
    isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

// Handle selecting a saved analysis
const handleSelectSavedAnalysis = (analysis) => {
  resetState()
  
  // Set flag to prevent the mode watcher from clearing results
  isLoadingSavedAnalysis.value = true
  
  // Set the analysis data
  results.value = analysis.results
  originalClaim.value = analysis.originalClaim
  
  // Set the mode based on the saved analysis
  selectedMode.value = analysis.mode || 'fact_check'
  
  // Fill the input box with the original claim
  inputText.value = analysis.originalClaim
  uploadedFile.value = null
  imagePreview.value = ''
  
  // Reset the flag after Vue's reactivity has processed
  nextTick(() => {
    isLoadingSavedAnalysis.value = false
  })
  
  // Show notification
  notification.success({
    message: 'Analysis Loaded',
    description: `Loaded analysis from ${new Date(analysis.timestamp).toLocaleDateString()}`,
    duration: 3
  })
  
  // Scroll to results
  nextTick(() => {
    const resultsElement = document.querySelector('.results-container')
    if (resultsElement) {
      resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  })
}

const handleSelectSavedAnalysisAndCloseMenu = (analysis) => {
    handleSelectSavedAnalysis(analysis);
    isMobileMenuOpen.value = false;
};

const handleKeyPress = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSubmit()
  }
}
</script>

<template>
  <Layout class="main-layout" :lang="locale === 'zh' ? 'zh-CN' : 'en'">
    <Header class="header">
      <div class="header-content">
        <div class="logo-section" @click="handleLogoClick">
          <img 
            src="./assets/logo.png" 
            alt="Logo" 
            class="logo-image"
            style="height: 56px; width: auto; margin-right: 8px;"
          />
          <Title level="2" class="logo-text">
            {{ t('app.website') }}
          </Title>
        </div>
        <div class="header-actions" ref="headerActionsRef">
          <div class="header-menu-items-wrapper-desktop">
             <SavedAnalysesDropdown @select-analysis="handleSelectSavedAnalysisAndCloseMenu" />
             <LanguageSelector />
          </div>
          <Button 
            class="mobile-menu-button" 
            @click="toggleMobileMenu" 
            :class="{ 'is-active': isMobileMenuOpen }"
          >
            ☰
          </Button>
          <transition name="dropdown-fade">
            <div v-if="isMobileMenuOpen" class="header-menu-items-wrapper-mobile">
              <SavedAnalysesDropdown @select-analysis="handleSelectSavedAnalysisAndCloseMenu" />
              <LanguageSelector />
            </div>
          </transition>
        </div>
      </div>
    </Header>
    <Content class="content">
      <div class="main-container">
        <div class="hero-section">
          <Title level="1" class="main-title">
            {{ selectedMode === 'fact_check' ? t('app.title') : t('app.researchTitle') }}
          </Title>
          <Paragraph class="subtitle">
            {{ selectedMode === 'fact_check' ? t('app.subtitle') : t('app.researchSubtitle') }}
          </Paragraph>
        </div>
        
        <ModeSelector v-model:mode="selectedMode" />
        
        <div class="input-section">
          <Space direction="vertical" size="large" class="input-container">
            <div 
              class="input-wrapper"
              :class="{ 'drag-over': isDragOver }"
              @dragover="handleDragOver"
              @dragleave="handleDragLeave"
              @drop="handleDrop"
            >
              <Input.TextArea
                v-model:value="inputText"
                :placeholder="selectedMode === 'fact_check' ? t('app.inputPlaceholder') : t('app.researchPlaceholder')"
                :rows="6"
                class="main-input"
                @keypress="handleKeyPress"
                @paste="handlePaste"
              />
              <div class="input-controls">
                <input
                  type="file"
                  id="photo-upload"
                  accept="image/*"
                  @change="handleFileUpload"
                  style="display: none;"
                />
                <Button 
                  class="upload-button"
                  @click="triggerFileUpload"
                  size="small"
                >
                  📷 {{ t('app.uploadButton') }}
                </Button>
              </div>
              
              <div v-if="isDragOver" class="drag-overlay">
                <div class="drag-message">
                  📷 Drop your image here
                </div>
              </div>
              
              <div v-if="imagePreview" class="image-preview">
                <div class="preview-header">
                  <span class="preview-title">Uploaded Image:</span>
                  <Button 
                    class="remove-button" 
                    size="small" 
                    @click="removeImage"
                  >
                    ✕
                  </Button>
                </div>
                <img :src="imagePreview" alt="Uploaded preview" class="preview-image" />
              </div>
            </div>
            
            <Button 
              type="primary" 
              size="large" 
              class="submit-button"
              :loading="isLoading"
              :disabled="!inputText.trim() && !uploadedFile"
              @click="handleSubmit"
            >
              {{ isLoading ? t('app.analyzing') : (selectedMode === 'fact_check' ? t('app.factCheck') : t('app.research')) }}
            </Button>
            
            <Button 
              v-if="isLoading"
              size="large" 
              class="cancel-button"
              @click="handleCancel"
            >
              Cancel
            </Button>
          </Space>
        </div>
        
        <div ref="analysisProgressRef">
          <AnalysisProgress 
            :isLoading="isLoading"
            :progress="progress"
            :isConnected="isConnected"
            :usePolling="usePolling"
            :mode="currentMode"
          />
        </div>
        
        <div v-if="results" class="results-container">
          <FactCheckResults 
            v-if="selectedMode === 'fact_check'"
            :results="results"
            :originalClaim="originalClaim"
            :uploadedImage="imagePreview"
          />
          <ResearchResults 
            v-else
            :results="results"
            :originalClaim="originalClaim"
          />
        </div>
        <div v-if="results" class="new-analysis-section">
          <Button 
            type="default"
            size="large"
            class="new-analysis-button"
            @click="handleNewAnalysis"
          >
            {{ selectedMode === 'fact_check' ? 'Start New Analysis' : 'Start New Research' }}
          </Button>
        </div>
        
        <div v-if="!isLoading && !results" class="examples-section">
          <Paragraph class="examples-title">{{ t('app.exampleTitle') }}</Paragraph>
          <div class="rotating-example">
            <div 
              class="example-card rotating" 
              @click="selectExample(currentExample)"
            >
              <div class="example-text">{{ currentExample }}</div>
            </div>
          </div>
        </div>
        
        <div v-if="!isLoading && !results" class="info-section">
          <Paragraph class="info-text">
            {{ t('app.infoText') }}
          </Paragraph>
        </div>
      </div>
    </Content>
    
    <footer class="main-footer">
      <div class="footer-content">
        <div class="footer-section footer-links">
          <h4 class="footer-title">Also Try</h4>
          <ul class="footer-list">
            <li><a href="https://apply4college.org" class="footer-link">Apply 4 College</a></li>
            <li><a href="https://chromewebstore.google.com/detail/mdkidaggpdhcaifbiakpdepclddngfcp?utm_source=item-share-cb" class="footer-link">Extension GPE</a></li>
            <li><a href="#" class="footer-link">Singularity Academy</a></li>
          </ul>
        </div>
        
        <div class="footer-section footer-contributors">
          <h4 class="footer-title">Contributors</h4>
          <ul class="footer-list">
            <li><a href="https://www.gpeclub.com" class="footer-link">GPE Club</a></li>
            <li><a href="https://github.com/BroWo1" class="footer-link">Will Li</a></li>
            <li class="footer-text">Eric Jia</li>
          </ul>
        </div>
      </div>
      
      <div class="footer-bottom">
        <p class="footer-copyright">
          © 2025 {{ t('app.website') }}.
        </p>
      </div>
    </footer>
  </Layout>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Crimson+Text:wght@400;600&display=swap');
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');

.main-layout {
  min-height: 100vh;
  background: #ffffff;
}

.footer-text {
  color: #666666;
}

.header {
  background: #ffffff;
  border-bottom: 1px solid #e0e0e0;
  padding: 0;
  height: 80px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  transform: translateY(0);
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

.mobile-menu-button {
    display: none;
}

.logo-text {
  font-family: 'Playfair Display', serif !important;
  color: #000000 !important;
  margin: 0 !important;
  font-weight: 700 !important;
  font-size: 28px !important;
  letter-spacing: -0.5px;
}

.content {
  padding: 0;
}

.main-container {
  max-width: 700px;
  margin: 0 auto;
  padding: 60px 24px 40px;
  text-align: center;
}
.results-container {
  margin-top: 32px;
}

.hero-section {
  margin-bottom: 40px;
}

.examples-section {
  margin-bottom: 20px;
}

.examples-title {
  font-family: 'Crimson Text', serif !important;
  font-size: 14px !important;
  color: #666666 !important;
  margin-bottom: 12px !important;
  font-weight: 500 !important;
}

.rotating-example {
  max-width: 500px;
  margin: 0 auto;
}

.example-card.rotating {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
  animation: fadeIn 0.5s ease-in-out;
}

.example-card.rotating:hover {
  background: #f5f5f5;
  border-color: #d9d9d9;
  transform: translateY(-1px);
}

.example-text {
  font-family: 'Crimson Text', serif;
  font-size: 13px;
  color: #555555;
  line-height: 1.3;
}

@keyframes fadeIn {
  from {
    opacity: 0.6;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.main-title {
  font-family: 'Playfair Display', serif !important;
  font-size: 48px !important;
  font-weight: 700 !important;
  color: #000000 !important;
  margin-bottom: 16px !important;
  letter-spacing: -1px;
  line-height: 1.2;
}

.subtitle {
  font-family: 'Crimson Text', serif !important;
  font-size: 20px !important;
  color: #666666 !important;
  max-width: 600px;
  margin: 0 auto !important;
  line-height: 1.6;
}

.input-section {
  margin-bottom: 30px;
}

.input-container {
  width: 100%;
}

.input-wrapper {
  position: relative;
  width: 100%;
  transition: all 0.3s ease;
}

.input-wrapper.drag-over {
  transform: scale(1.02);
}

.drag-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.05);
  border: 2px dashed #000000;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
  pointer-events: none;
}

.drag-message {
  font-family: 'Crimson Text', serif;
  font-size: 18px;
  color: #000000;
  font-weight: 600;
  text-align: center;
  background: rgba(255, 255, 255, 0.9);
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.input-controls {
  position: absolute;
  bottom: 12px;
  right: 12px;
  z-index: 10;
}

.upload-button {
  background: #f8f9fa !important;
  border: 1px solid #e9ecef !important;
  color: #666666 !important;
  font-family: 'Crimson Text', serif !important;
  font-size: 12px !important;
  height: 32px !important;
  border-radius: 6px !important;
  transition: all 0.2s ease !important;
}

.upload-button:hover {
  background: #e9ecef !important;
  border-color: #000000 !important;
  color: #000000 !important;
}

.image-preview {
  margin-top: 16px;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 12px;
  background: #fafafa;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.preview-title {
  font-family: 'Crimson Text', serif;
  font-size: 13px;
  color: #666666;
  font-weight: 600;
}

.remove-button {
  background: #fff !important;
  border: 1px solid #d9d9d9 !important;
  color: #999999 !important;
  font-size: 12px !important;
  height: 24px !important;
  width: 24px !important;
  border-radius: 4px !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.remove-button:hover {
  background: #f5f5f5 !important;
  border-color: #ff4d4f !important;
  color: #ff4d4f !important;
}

.preview-image {
  max-width: 100%;
  max-height: 200px;
  border-radius: 6px;
  object-fit: contain;
  display: block;
  margin: 0 auto;
}

.main-input {
  border-radius: 8px !important;
  border: 1px solid #d9d9d9 !important;
  font-family: 'Crimson Text', serif !important;
  font-size: 16px !important;
  transition: all 0.2s ease !important;
  resize: none !important;
  background: #ffffff !important;
}

.main-input:hover {
  border-color: #000000 !important;
}

.main-input:focus {
  border-color: #000000 !important;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1) !important;
}

.submit-button {
  border-radius: 8px !important;
  height: 48px !important;
  padding: 0 32px !important;
  font-family: 'Crimson Text', serif !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  background: #000000 !important;
  border-color: #000000 !important;
  transition: all 0.2s ease !important;
}

.submit-button:hover {
  background: #333333 !important;
  border-color: #333333 !important;
  transform: translateY(-1px);
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  color: #858585 !important;
}

.cancel-button {
  border-radius: 8px !important;
  height: 48px !important;
  padding: 0 32px !important;
  font-family: 'Crimson Text', serif !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  background: #ffffff !important;
  border-color: #ff4d4f !important;
  color: #ff4d4f !important;
  transition: all 0.2s ease !important;
}

.cancel-button:hover {
  background: #ff4d4f !important;
  border-color: #ff4d4f !important;
  color: #ffffff !important;
  transform: translateY(-1px);
}

.new-analysis-section {
  margin: 30px 0;
  text-align: center;
}

.new-analysis-button {
  border-radius: 8px !important;
  height: 48px !important;
  padding: 0 32px !important;
  font-family: 'Crimson Text', serif !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  background: #ffffff !important;
  border-color: #000000 !important;
  color: #000000 !important;
  transition: all 0.2s ease !important;
}

.new-analysis-button:hover {
  background: #000000 !important;
  border-color: #000000 !important;
  color: #ffffff !important;
  transform: translateY(-1px);
}

.info-section {
  margin-top: 30px;
}

.info-text {
  font-family: 'Crimson Text', serif !important;
  color: #999999 !important;
  font-size: 16px !important;
  margin: 0 !important;
}

/* Footer Styles */
.main-footer {
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
  margin-top: 60px;
  padding: 40px 0 20px;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  gap: 60px;
}

.footer-section {
  flex: 1;
}

.footer-title {
  font-family: 'Playfair Display', serif;
  font-size: 16px;
  font-weight: 600;
  color: #000000;
  margin: 0 0 16px 0;
}

.footer-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.footer-list li {
  margin-bottom: 8px;
}

.footer-link {
  font-family: 'Crimson Text', serif;
  font-size: 14px;
  color: #666666;
  text-decoration: none;
  transition: color 0.2s ease;
}

.footer-link:hover {
  color: #000000;
  text-decoration: none;
}

.footer-bottom {
  border-top: 1px solid #e9ecef;
  margin-top: 32px;
  padding: 16px 0 0;
  text-align: center;
}

.footer-copyright {
  font-family: 'Crimson Text', serif;
  font-size: 12px;
  color: #999999;
  margin: 0;
}

.footer-links {
  text-align: left;
}

.footer-contributors {
  text-align: right;
}

/* Dropdown Animation */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@media (max-width: 768px) {
  .header {
    height: 70px;
  }
  
  .header-content {
    padding: 0 16px;
    gap: 8px;
  }
  
  .logo-section {
    margin-left: -4px;
    padding: 4px;
    min-width: 0;
    flex: 1;
  }
  
  .logo-image {
    height: 40px !important;
    margin-right: 6px !important;
  }
  
  .logo-text {
    font-size: 20px !important;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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

  .header-menu-items-wrapper-mobile {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    background: white;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 6px 16px rgba(0,0,0,0.12);
    border: 1px solid #f0f0f0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    z-index: 120;
    width: 220px;
  }
  
  .main-title {
    font-size: 36px !important;
  }
  
  .subtitle {
    font-size: 18px !important;
  }
  
  .main-container {
    padding: 40px 16px;
  }
  
  .examples-title {
    font-size: 13px !important;
  }
  
  .example-card.rotating {
    padding: 10px 14px;
  }
  
  .example-text {
    font-size: 12px !important;
  }
  
  .input-controls {
    bottom: 8px;
    right: 8px;
  }
  
  .upload-button {
    font-size: 11px !important;
    height: 28px !important;
  }
  
  .preview-image {
    max-height: 150px;
  }
  
  .drag-message {
    font-size: 16px !important;
    padding: 12px 20px;
  }
  
  .input-wrapper.drag-over {
    transform: scale(1.01);
  }
  
  .footer-content {
    flex-direction: column;
    gap: 30px;
    padding: 0 16px;
  }
  
  .footer-links,
  .footer-contributors {
    text-align: center;
  }
  
  .main-footer {
    margin-top: 40px;
    padding: 30px 0 16px;
  }
}

@media (max-width: 480px) {
  .header {
    height: 60px;
  }
  
  .header-content {
    padding: 0 12px;
  }
  
  .logo-image {
    height: 32px !important;
    margin-right: 4px !important;
  }
  
  .logo-text {
    font-size: 16px !important;
  }
  
  .header-actions {
    gap: 4px;
  }
  
  .main-container {
    padding: 30px 12px;
  }
  
  .main-title {
    font-size: 28px !important;
  }
  
  .subtitle {
    font-size: 16px !important;
  }
}
</style>