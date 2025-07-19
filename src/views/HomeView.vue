<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Input, Button, Typography, Space, Layout, Upload, notification, Modal } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { useFactCheck } from '../composables/useFactCheck'
import { useSavedAnalyses } from '../composables/useSavedAnalyses'
import { useSessionRecovery } from '../composables/useSessionRecovery'
import AnalysisProgress from '../components/Progress2.vue'
import FactCheckResults from '../components/FactCheckResults.vue'
import ResearchResults from '../components/ResearchResults.vue'
import LanguageSelector from '../components/LanguageSelector.vue'
import SavedAnalysesDropdown from '../components/SavedAnalysesDropdown.vue'
import ModeSelector from '../components/ModeSelector.vue'
import SessionRecoveryDialog from '../components/SessionRecoveryDialog.vue'
import NotificationPermissionBanner from '../components/NotificationPermissionBanner.vue'
import TableOfContents from '../components/TableOfContents.vue'
import sessionPersistenceService from '../services/sessionPersistenceService'

// Define props
const props = defineProps({
  uuid: String
})

const { Title, Paragraph } = Typography
const { Header, Content } = Layout
const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()

// Get the uuid from route params or props
const uuid = ref(route.params.uuid || props.uuid)
const tocHeadings = ref([]);
const isTocCollapsed = ref(true); // Default to collapsed on mobile

const showToc = computed(() => {
  return !!results.value && selectedMode.value === 'research' && tocHeadings.value.length > 0;
});


const handleHeadingsExtracted = (headings) => {
  tocHeadings.value = headings
}

// Function to navigate to analysis URL
const navigateToAnalysis = (analysisId) => {
  router.push(`/${analysisId}`)
}

// Handle selecting a saved analysis - defined after all variables are declared
function handleSelectSavedAnalysis(analysis) {
  resetState()

  // Set flag to prevent the mode watcher from clearing results
  isLoadingSavedAnalysis.value = true

  // Set the analysis data
  results.value = analysis.results
  originalClaim.value = analysis.originalClaim

  // Set the mode based on the saved analysis
  selectedMode.value = analysis.mode || 'fact_check'
  currentMode.value = analysis.mode || 'fact_check'

  // Restore progress data if available
  if (analysis.progress) {
    // Since progress is a reactive object, we need to update its properties individually
    Object.assign(progress, analysis.progress)
  }

  // Store in mode-specific storage for preservation during mode switching
  progressDataByMode.value[analysis.mode || 'fact_check'] = {
    results: analysis.results,
    originalClaim: analysis.originalClaim,
    progress: analysis.progress || null,
    hasResults: true
  }

  // Always start collapsed for auto-hide behavior
  progressCollapsed.value = true

  // Fill the input box with the original claim
  inputText.value = analysis.originalClaim
  uploadedFile.value = null
  imagePreview.value = ''

  // Navigate to the analysis URL (only if not already there)
  if (route.params.uuid !== analysis.id) {
    navigateToAnalysis(analysis.id)
  }

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
    const resultsElement = document.querySelector('.results-content-area')
    if (resultsElement) {
      resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  })
}

// Function to load analysis from UUID
const loadAnalysisFromUuid = (analysisUuid) => {
  console.log('Loading analysis from UUID:', analysisUuid)
  console.log('Available analyses:', savedAnalyses.value.map(a => ({ id: a.id, claim: a.originalClaim?.substring(0, 50) })))

  if (!analysisUuid) return

  const analysis = savedAnalyses.value.find(a => a.id === analysisUuid)
  if (analysis) {
    console.log('Found analysis:', analysis.originalClaim?.substring(0, 50))
    handleSelectSavedAnalysis(analysis)
  } else {
    console.log('Analysis not found for UUID:', analysisUuid)
    // Only redirect if we have saved analyses loaded (to avoid premature redirects)
    if (savedAnalyses.value.length > 0) {
      router.push('/')
      notification.warning({
        message: 'Analysis Not Found',
        description: 'The requested analysis could not be found.',
        duration: 3
      })
    }
  }
}

// Watch for route changes
watch(() => route.params.uuid, (newUuid) => {
  uuid.value = newUuid
  if (newUuid) {
    loadAnalysisFromUuid(newUuid)
  }
})

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
  recoverSession,
  cancelFactCheck,
  resetState
} = useFactCheck()

// Saved analyses integration
const { saveAnalysis, savedAnalyses } = useSavedAnalyses()

// Debug function to manually test saving
const testSave = () => {
  console.log('🧪 Manual test save triggered')
  const testResults = {
    verdict: 'likely_true',
    confidence_score: 0.85,
    summary: 'Test analysis',
    reasoning: 'This is a test'
  }
  const testClaim = 'This is a test claim for debugging'
  const analysisId = saveAnalysis(testResults, testClaim, 'fact_check')
  console.log('🧪 Test save result:', analysisId)
  console.log('🧪 Current savedAnalyses length:', savedAnalyses.value.length)
}

// Track if we're currently loading a saved analysis to prevent clearing results
const isLoadingSavedAnalysis = ref(false)

// Track if we're currently recovering a session to prevent clearing results
const isRecoveringSession = ref(false)

// Store progress data per mode to preserve thinking process when switching
const progressDataByMode = ref({
  fact_check: {
    results: null,
    originalClaim: null,
    progress: null,
    hasResults: false
  },
  research: {
    results: null,
    originalClaim: null,
    progress: null,
    hasResults: false
  }
})

const analysisProgressRef = ref(null)
const progressCollapsed = ref(true)  // Default to collapsed for auto-hide behavior
// Watch for saved analyses to be loaded, then check for UUID
watch(savedAnalyses, (analyses) => {
  console.log('Saved analyses updated, count:', analyses.length)
  // If we have a UUID in the route and analyses are now loaded, try loading the analysis
  if (uuid.value && analyses.length > 0) {
    loadAnalysisFromUuid(uuid.value)
  }
}, { immediate: true })

// Session recovery integration
const {
  availableSessions,
  isRecovering,
  showRecoveryDialog,
  hasRecoverableSessions,
  formatSessionForDisplay,
  recoverSession: handleRecoverSession,
  dismissSession,
  dismissAllSessions,
  closeRecoveryDialog,
  checkForRecoverableSessions
} = useSessionRecovery()

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

// Watch for mode changes to reset examples and switch context
watch(selectedMode, (newMode, oldMode) => {
  const activeExamples = newMode === 'fact_check' ? examples.value : researchExamples.value
  currentExampleIndex.value = 0
  currentExample.value = activeExamples[0]

  // Update the current mode for the progress component
  currentMode.value = newMode

  // Only save and switch context if we're not currently loading a saved analysis or recovering a session
  if (!isLoadingSavedAnalysis.value && !isRecoveringSession.value) {
    // Save current state to the previous mode
    if (oldMode && (results.value || progress.steps?.length > 0)) {
      progressDataByMode.value[oldMode] = {
        results: results.value,
        originalClaim: originalClaim.value,
        progress: progress.steps?.length > 0 ? {
          percentage: progress.percentage,
          currentStep: progress.currentStep,
          stepNumber: progress.stepNumber,
          totalSteps: progress.totalSteps,
          completedSteps: progress.completedSteps,
          failedSteps: progress.failedSteps,
          expectedSteps: progress.expectedSteps,
          steps: [...progress.steps]
        } : null,
        hasResults: !!results.value
      }
    }

    // Load state for the new mode
    const modeData = progressDataByMode.value[newMode]
    if (modeData.results || modeData.progress) {
      // Restore the previous state for this mode
      results.value = modeData.results
      originalClaim.value = modeData.originalClaim
      if (modeData.progress) {
        // Restore progress state
        progress.percentage = modeData.progress.percentage || 100
        progress.currentStep = modeData.progress.currentStep || ''
        progress.stepNumber = modeData.progress.stepNumber || 0
        progress.totalSteps = modeData.progress.totalSteps || 0
        progress.completedSteps = modeData.progress.completedSteps || 0
        progress.failedSteps = modeData.progress.failedSteps || 0
        progress.expectedSteps = modeData.progress.expectedSteps || (newMode === 'research' ? 3 : 4)
        progress.steps = modeData.progress.steps || []
      }
      // Keep progress expanded if we have data to show
      progressCollapsed.value = false
    } else {
      // Clear state for new mode with no previous data
      results.value = null
      originalClaim.value = null
      uploadedFile.value = null
      imagePreview.value = ''
      progressCollapsed.value = true
      // Reset progress state
      progress.percentage = 0
      progress.currentStep = ''
      progress.stepNumber = 0
      progress.totalSteps = 0
      progress.completedSteps = 0
      progress.failedSteps = 0
      progress.expectedSteps = newMode === 'research' ? 3 : 4
      progress.steps = []
    }
  }

  // On mode switch, always return to the home page to avoid URL/state mismatch.
  if (route.path !== '/') {
    router.push('/')
  }
})

const handleClickOutside = (event) => {
  if (isMobileMenuOpen.value && headerActionsRef.value && !headerActionsRef.value.contains(event.target)) {
    isMobileMenuOpen.value = false;
  }
};

onMounted(() => {
  console.log('HomeView mounted, route params:', route.params)
  console.log('UUID from props:', props.uuid)
  console.log('UUID from route:', route.params.uuid)

  rotationInterval = setInterval(rotateExample, 4000) // Rotate every 4 seconds
  document.addEventListener('click', handleClickOutside);

  // Initialize session persistence service
  sessionPersistenceService.initialize()

  // Check for recoverable sessions
  checkForRecoverableSessions()

  // Load analysis if UUID is present in the route
  if (uuid.value) {
    console.log('Loading analysis on mount for UUID:', uuid.value)
    loadAnalysisFromUuid(uuid.value)
  }
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




const handleSubmit = async () => {
  if (!inputText.value.trim() && !uploadedFile.value) return
  try {
    // Clear stored data for current mode when starting new analysis
    progressDataByMode.value[selectedMode.value] = {
      results: null,
      originalClaim: null,
      progress: null,
      hasResults: false
    }

    progressCollapsed.value = false

    // Navigate to home if we're currently on an analysis page
    if (route.params.uuid) {
      router.push('/')
    }

    await startFactCheck(inputText.value, uploadedFile.value, selectedMode.value)

    // Scroll to progress
    await nextTick()
    if (analysisProgressRef.value && analysisProgressRef.value.$el) {
      analysisProgressRef.value.$el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  } catch (error) {
    console.error('Fact-check submission failed:', error)
  }
}

// Watch for results to automatically save when analysis is complete
watch([results, originalClaim], ([newResults, newOriginalClaim]) => {
  console.log('🎯 Watch triggered - Results:', !!newResults, 'OriginalClaim:', !!newOriginalClaim, 'Loading:', isLoading.value)
  console.log('🔍 Results type:', typeof newResults, 'Claim type:', typeof newOriginalClaim)
  console.log('📋 Results content:', newResults ? Object.keys(newResults) : 'null')
  console.log('🚩 isLoadingSavedAnalysis:', isLoadingSavedAnalysis.value)
  console.log('🔄 isRecoveringSession:', isRecoveringSession.value)
  console.log('🔍 Original claim value:', newOriginalClaim)
  console.log('🔍 Original claim length:', newOriginalClaim?.length)
  console.log('🔍 Original claim truthy:', !!newOriginalClaim)

  // Temporarily remove isLoadingSavedAnalysis condition to debug
  if (newResults && newOriginalClaim && !isLoading.value) {
    console.log('💾 Attempting to save analysis:', newOriginalClaim.substring(0, 50))
    try {
      const analysisId = saveAnalysis(newResults, newOriginalClaim, selectedMode.value, progressCollapsed.value, {
        percentage: progress.percentage,
        currentStep: progress.currentStep,
        stepNumber: progress.stepNumber,
        totalSteps: progress.totalSteps,
        completedSteps: progress.completedSteps,
        failedSteps: progress.failedSteps,
        expectedSteps: progress.expectedSteps,
        steps: [...progress.steps]
      })
      console.log('✅ Analysis saved successfully with ID:', analysisId)

      // Navigate to the analysis URL if we're not already there and not on a specific UUID page
      if (!route.params.uuid) {
        console.log('Navigating to analysis URL:', analysisId)
        navigateToAnalysis(analysisId)
      }
    } catch (err) {
      console.error('Error saving analysis:', err)
    }
  } else {
    console.log('❌ Save condition not met:', {
      hasResults: !!newResults,
      hasOriginalClaim: !!newOriginalClaim,
      originalClaimValue: newOriginalClaim,
      isLoading: isLoading.value,
      isLoadingSavedAnalysis: isLoadingSavedAnalysis.value,
      isRecoveringSession: isRecoveringSession.value
    })
  }
}, { immediate: true })

const handleNewAnalysis = () => {
  resetState()
  inputText.value = ''
  uploadedFile.value = null
  imagePreview.value = ''

  // Clear the mode data cache to prevent reloading old analyses
  clearAllModeData()

  // Navigate to home if we're currently on an analysis page
  if (route.params.uuid) {
    router.push('/')
  }
}

const handleLogoClick = () => {
  handleNewAnalysis()
  // Scroll to top smoothly
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const toggleMobileMenu = () => {
    isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

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

// Session recovery handlers
const handleRecoverSessionClick = async (sessionId) => {
  try {
    const sessionData = availableSessions.value.find(s => s.sessionId === sessionId)
    if (!sessionData) {
      throw new Error('Session data not found')
    }

    // Set flag to prevent the mode watcher from clearing results
    isRecoveringSession.value = true

    // Reset current state and recover session
    await recoverSession(sessionData)

    // Update UI state
    selectedMode.value = sessionData.mode || 'fact_check'
    inputText.value = sessionData.originalClaim
    uploadedFile.value = null
    imagePreview.value = ''

    // Navigate to home if we're currently on an analysis page
    if (route.params.uuid) {
      router.push('/')
    }

    // Close recovery dialog
    closeRecoveryDialog()

    // Reset the flag after Vue's reactivity has processed
    nextTick(() => {
      isRecoveringSession.value = false
    })

    // Scroll to progress if still loading
    if (isLoading.value) {
      await nextTick()
      const progressElement = document.querySelector('.progress-container')
      if (progressElement) {
        progressElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }

  } catch (error) {
    console.error('Failed to recover session:', error)
    // Error is already handled in the recovery composable
  }
}

// Function to clear all stored mode data (for complete reset)
const clearAllModeData = () => {
  progressDataByMode.value = {
    fact_check: {
      results: null,
      originalClaim: null,
      progress: null,
      hasResults: false
    },
    research: {
      results: null,
      originalClaim: null,
      progress: null,
      hasResults: false
    }
  }
}
</script>

<template>
  <Layout class="main-layout" :lang="locale === 'zh' ? 'zh-CN' : 'en'">
    <Header class="header">
      <div class="header-content">
        <div class="logo-section" @click="handleLogoClick">
          <img
            src="../assets/itlookslegitTrans.png"
            alt="Logo"
            class="logo-image"
            style="height: 56px; width: auto; margin-right: 8px;"
          />

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
              @click="cancelFactCheck"
            >
              Cancel
            </Button>
          </Space>
        </div>

        <div ref="analysisProgressRef">
          <NotificationPermissionBanner
            :mode="selectedMode"
            :isLoading="isLoading"
          />

          <AnalysisProgress
            :isLoading="isLoading"
            :progress="progress"
            :isConnected="isConnected"
            :usePolling="usePolling"
            :mode="currentMode"
            :initialCollapsed="progressCollapsed"
            :hasResults="!!results"
            @update:collapsed="progressCollapsed = $event"
          />
        </div>
      </div>

      <div v-if="results" class="results-layout-wrapper" :class="{ 'has-toc': showToc }">
        <div v-if="showToc" class="toc-wrapper" :class="{ 'is-collapsed': isTocCollapsed }">
          <TableOfContents
            :headings="tocHeadings"
            :visible="showToc"
            @update:collapsed="isTocCollapsed = $event"
          />
        </div>
        <div class="results-content-area">
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
            @headings-extracted="handleHeadingsExtracted"
          />
          <div class="new-analysis-section">
            <Button
              type="default"
              size="large"
              class="new-analysis-button"
              @click="handleNewAnalysis"
            >
              {{ selectedMode === 'fact_check' ? 'Start New Analysis' : 'Start New Research' }}
            </Button>
          </div>
        </div>
      </div>

      <div v-if="!isLoading && !results" class="main-container">
        <div class="examples-section">
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

        <div class="info-section">
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

    <SessionRecoveryDialog
      :visible="showRecoveryDialog"
      :sessions="availableSessions.map(formatSessionForDisplay)"
      :isRecovering="isRecovering"
      @recover="handleRecoverSessionClick"
      @dismiss="dismissSession"
      @dismissAll="dismissAllSessions"
      @close="closeRecoveryDialog"
    />
  </Layout>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Crimson+Text:wght@400;600&display=swap');
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');

@font-face {
  font-family: 'LXGW Neo ZhiSong Plus';
  src: url('../assets/fonts/LXGWNeoZhiSongPlus.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}

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
  font-family: 'Playfair Display', 'LXGW Neo ZhiSong Plus', serif !important;
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
  padding: 60px 24px 0;
  text-align: center;
}
/* Reduce top padding for subsequent containers */
.main-container:not(:first-child) {
    padding-top: 0;
}

.results-layout-wrapper {
    width: 100%;
    display: grid;
    /* Centered report column by default */
    grid-template-columns: [full-start] 1fr [main-start] minmax(0, 700px) [main-end] 1fr [full-end];
    grid-template-areas: ". report .";
    margin-top: 32px;
    padding: 0 24px;
    box-sizing: border-box;
}
.results-layout-wrapper.has-toc {
    grid-template-columns: 1fr minmax(0, 700px) 1fr;
    grid-template-areas: "left-gutter report right-gutter";
    gap: 40px;
}

.toc-wrapper {
    grid-area: left-gutter;
    justify-self: end;
}

.results-content-area {
    grid-area: report;
    min-width: 0; /* Prevents grid blowout */
    text-align: left;
}


.hero-section {
  margin-bottom: 40px;
}

.examples-section {
  margin-bottom: 20px;
}

.examples-title {
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif !important;
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
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
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
  font-family: 'Playfair Display', 'LXGW Neo ZhiSong Plus', serif !important;
  font-size: 48px !important;
  font-weight: 700 !important;
  color: #000000 !important;
  margin-bottom: 16px !important;
  letter-spacing: -1px;
  line-height: 1.2;
}

.subtitle {
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif !important;
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
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
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
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif !important;
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
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
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
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif !important;
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
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif !important;
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
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif !important;
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
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif !important;
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
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif !important;
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
  font-family: 'Playfair Display', 'LXGW Neo ZhiSong Plus', serif;
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
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
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
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
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

@media (max-width: 1200px) {
    .results-layout-wrapper.has-toc {
        grid-template-columns: 1fr;
        grid-template-areas:
            "left-gutter"
            "report";
        max-width: 700px;
        margin-left: auto;
        margin-right: auto;
        gap: 0;
    }
    .toc-wrapper {
        /* Make the whole TOC section sticky on mobile */
        position: sticky;
        top: 80px; /* Sticking point for tablets */
        z-index: 90;

        /* Visuals for floating state with enhanced transparency and blur */
        background: rgba(255, 255, 255, 0.5); /* More transparent background */
        backdrop-filter: blur(8px) saturate(1.2);
        -webkit-backdrop-filter: blur(8px) saturate(1.2); /* For Safari */

        /* Layout adjustments for full-width sticky bar */
        justify-self: stretch;
        margin: 0 -24px; /* Counteract parent padding to go full-width */
        padding: 0 24px; /* Add padding back inside */



        transition: background-color 0.3s ease, border-color 0.3s ease;
    }

    .toc-wrapper.is-collapsed {
        background-color: rgba(248, 249, 250, 0.7);

        /* Gradient mask for fade-out effect at bottom */

        mask: linear-gradient(to bottom, white 80%, transparent 100%);
        -webkit-mask: linear-gradient(to bottom, white 80%, transparent 100%);
    }
}

@media (max-width: 768px) {
    .toc-wrapper {
        top: 70px; /* Adjust for smaller header on phones */
    }
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
    padding-bottom: 0;
  }
   .results-layout-wrapper {
        padding: 0 16px;
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
</style>
