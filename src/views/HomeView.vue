<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue'
import { Presentation, Settings, Files } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import { Input, Button, Typography, Space, Layout, Upload, notification, Modal, Select, Tooltip } from 'ant-design-vue'
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
import AIContainer from '../components/AIContainer.vue'
import TextSelectionPopup from '../components/TextSelectionPopup.vue'
import SettingsModal from '../components/SettingsModal.vue'
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
const aiContainerRef = ref(null); // Reference to AIContainer component

const showToc = computed(() => {
  return !!results.value && (selectedMode.value === 'research' || selectedMode.value === 'fact_check') && tocHeadings.value.length > 0;
});


const handleHeadingsExtracted = (headings) => {
  tocHeadings.value = headings
}


const handleSectionUpdated = (updatedResults) => {
  console.log('Section updated event received in HomeView')
  console.log('Current results length:', results.value?.summary?.length || 0)
  console.log('Updated results length:', updatedResults?.summary?.length || 0)
  
  // Update the results with the new section content
  results.value = updatedResults
  
  console.log('Results updated, new length:', results.value?.summary?.length || 0)
}

const handleOpenPPTGenerator = () => {
  // Trigger the PPT generator to open by expanding it
  if (aiContainerRef.value) {
    // The PPT generator is part of AIContainer, we can dispatch a custom event
    // or add a method to AIContainer to expand the PPT generator
    window.dispatchEvent(new CustomEvent('open-ppt-generator'))
  }
}


// Handle text selection for AI citation
const handleTextSelection = (selectedText) => {
  if (aiContainerRef.value && aiContainerRef.value.handleCitation) {
    aiContainerRef.value.handleCitation(selectedText)
  }
}

// Function to navigate to analysis URL
const navigateToAnalysis = (analysisId) => {
  router.push(`/${analysisId}`)
}

// Debounce mechanism for preventing duplicate notifications
let lastSelectedAnalysisId = null
let notificationTimeout = null

// Handle selecting a saved analysis - defined after all variables are declared
function handleSelectSavedAnalysis(analysis) {
  // Prevent duplicate notifications for the same analysis within a short time window
  if (lastSelectedAnalysisId === analysis.id && notificationTimeout) {
    return
  }

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

  // Show notification (with debounce protection)
  lastSelectedAnalysisId = analysis.id
  clearTimeout(notificationTimeout)
  notificationTimeout = setTimeout(() => {
    lastSelectedAnalysisId = null
    notificationTimeout = null
  }, 1000) // Reset after 1 second

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
  hasAttemptedUuidLoad.value = false // Reset the flag for new UUID
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
const selectedStyle = ref('professional') // Default style for research reports
const isMobileMenuOpen = ref(false)
const headerActionsRef = ref(null)
const selectedMode = ref('fact_check')
const showSettingsModal = ref(false)

// Feature intro modal state
const showFeatureIntroModal = ref(false)
const FEATURE_INTRO_FOREVER_KEY = 'feature-intro-dismissed-forever'
const FEATURE_INTRO_UNTIL_KEY = 'feature-intro-dismissed-until'

const shouldShowFeatureIntro = () => {
  try {
    const forever = localStorage.getItem(FEATURE_INTRO_FOREVER_KEY)
    if (forever === 'true') return false
    const until = localStorage.getItem(FEATURE_INTRO_UNTIL_KEY)
    if (until) {
      const untilTs = parseInt(until, 10)
      if (!isNaN(untilTs) && Date.now() < untilTs) {
        return false
      }
    }
  } catch (e) {
    console.warn('Feature intro localStorage read failed:', e)
  }
  return true
}

const dismissFeatureIntroForOneDay = () => {
  try {
    const oneDayMs = 24 * 60 * 60 * 1000
    localStorage.setItem(FEATURE_INTRO_UNTIL_KEY, (Date.now() + oneDayMs).toString())
  } catch (e) {
    console.warn('Feature intro localStorage write failed:', e)
  }
  showFeatureIntroModal.value = false
}

const dismissFeatureIntroForever = () => {
  try {
    localStorage.setItem(FEATURE_INTRO_FOREVER_KEY, 'true')
    localStorage.removeItem(FEATURE_INTRO_UNTIL_KEY)
  } catch (e) {
    console.warn('Feature intro localStorage write failed:', e)
  }
  showFeatureIntroModal.value = false
}

// Open feature intro from Settings modal
const handleShowFeatureIntro = () => {
  showSettingsModal.value = false
  const delay = (globalThis && globalThis.setTimeout) ? globalThis.setTimeout : setTimeout
  delay(() => { showFeatureIntroModal.value = true }, 150)
}

// Max mode setting (reads from localStorage like in SettingsModal)
const maxMode = ref(false)

// Load max mode setting from localStorage on mount
onMounted(() => {
  try {
    const saved = localStorage.getItem('settings-max-mode')
    if (saved !== null) {
      maxMode.value = JSON.parse(saved)
    }
  } catch (error) {
    console.warn('Failed to load max mode setting:', error)
  }
})

// Watch for changes in localStorage (when changed in SettingsModal)
const checkMaxModeFromStorage = () => {
  try {
    const saved = localStorage.getItem('settings-max-mode')
    if (saved !== null) {
      maxMode.value = JSON.parse(saved)
    }
  } catch (error) {
    console.warn('Failed to load max mode setting:', error)
  }
}

// Listen for storage events to sync across components
window.addEventListener('storage', (e) => {
  if (e.key === 'settings-max-mode') {
    checkMaxModeFromStorage()
  }
})

// Also listen for custom events when the settings modal updates the value
const handleStorageChange = () => {
  checkMaxModeFromStorage()
}

// Set up interval to check for changes every second (simple polling)
const maxModeCheckInterval = setInterval(checkMaxModeFromStorage, 1000)

onUnmounted(() => {
  clearInterval(maxModeCheckInterval)
  window.removeEventListener('storage', handleStorageChange)
})

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

// Get the effective sessionId - use prop or fallback to results.session_id
const effectiveSessionId = computed(() => {
  const propSessionId = sessionId.value && sessionId.value.trim() !== '' ? sessionId.value : null
  const resultsSessionId = results.value?.session_id || null
  
  const effective = propSessionId || resultsSessionId
  
  console.log('HomeView - Effective sessionId calculation:', {
    propSessionId,
    resultsSessionId,
    effective
  })
  
  return effective
})

// Debug sessionId changes
watch(sessionId, (newSessionId, oldSessionId) => {
  console.log('HomeView - sessionId changed:', {
    old: oldSessionId,
    new: newSessionId,
    results: !!results.value,
    isLoading: isLoading.value
  })
}, { immediate: true })

// Saved analyses integration
const { saveAnalysis, savedAnalyses } = useSavedAnalyses()

// Get current analysis summary for PDF title
const currentAnalysisSummary = computed(() => {
  if (!uuid.value) return null
  const analysis = savedAnalyses.value.find(a => a.id === uuid.value)
  return analysis?.summary || null
})

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
// Track if we've already attempted to load from UUID to prevent duplicates
const hasAttemptedUuidLoad = ref(false)

// Mobile detection
const isMobile = ref(false)

// Mobile AI tools menu
const showAIToolsMenu = ref(false)
const isAIToolsPopupOpen = ref(false)

// Back to top functionality
const showBackToTop = ref(false)
const SCROLL_STORAGE_KEY = 'homeview-scroll-position'
let scrollSaveTimeout = null

const handleScroll = () => {
  showBackToTop.value = window.scrollY > 300
  showAIToolsMenu.value = window.scrollY > 300 && isMobile.value
  
  // Debounce scroll position saving to avoid excessive localStorage writes
  if (scrollSaveTimeout) {
    clearTimeout(scrollSaveTimeout)
  }
  
  scrollSaveTimeout = setTimeout(() => {
    try {
      localStorage.setItem(SCROLL_STORAGE_KEY, window.scrollY.toString())
    } catch (error) {
      console.warn('Failed to save scroll position:', error)
    }
  }, 150) // Save position after 150ms of scroll inactivity
}

const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
  
  // Clear saved scroll position when user explicitly scrolls to top
  try {
    localStorage.removeItem(SCROLL_STORAGE_KEY)
  } catch (error) {
    console.warn('Failed to clear scroll position:', error)
  }
}

const checkMobileState = () => {
  isMobile.value = window.innerWidth <= 1200
  showAIToolsMenu.value = window.scrollY > 300 && isMobile.value
}

const toggleAIToolsPopup = () => {
  isAIToolsPopupOpen.value = !isAIToolsPopupOpen.value
}

const closeAIToolsPopup = () => {
  isAIToolsPopupOpen.value = false
}

const openAIQuickAsk = () => {
  // Close popup first
  closeAIToolsPopup()
  // Trigger the mobile overlay through a custom event with a small delay
  setTimeout(() => {
    console.log('Dispatching open-ai-quick-ask-mobile event')
    window.dispatchEvent(new CustomEvent('open-ai-quick-ask-mobile'))
  }, 100)
}

const openAIPPT = () => {
  // For now, show unavailable message
  // In the future, this will open the AI PPT mobile modal
  closeAIToolsPopup()
}

const restoreScrollPosition = () => {
  try {
    const savedPosition = localStorage.getItem(SCROLL_STORAGE_KEY)
    if (savedPosition) {
      const position = parseInt(savedPosition, 10)
      if (!isNaN(position) && position > 0) {
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          window.scrollTo({
            top: position,
            behavior: 'smooth' // Smooth animation instead of instant
          })
        })
      }
    }
  } catch (error) {
    console.warn('Failed to restore scroll position:', error)
  }
}

// Watch for saved analyses to be loaded, then check for UUID
watch(savedAnalyses, (analyses) => {
  console.log('Saved analyses updated, count:', analyses.length)
  // If we have a UUID in the route and analyses are now loaded, try loading the analysis
  // Only attempt once to prevent duplicate loads
  if (uuid.value && analyses.length > 0 && !hasAttemptedUuidLoad.value) {
    hasAttemptedUuidLoad.value = true
    loadAnalysisFromUuid(uuid.value)
  }
}, { immediate: true })

// Session recovery integration
const {
  availableSessions,
  isRecovering,
  showRecoveryDialog,
  formatSessionForDisplay,
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
  if (isMobileMenuOpen.value) {
    // Check if click is outside the entire header
    const header = document.querySelector('.header');
    if (header && !header.contains(event.target)) {
      isMobileMenuOpen.value = false;
    }
  }
  
  // Close AI tools popup when clicking outside
  if (isAIToolsPopupOpen.value && !event.target.closest('.ai-tools-container')) {
    closeAIToolsPopup()
  }
};

onMounted(() => {
  console.log('HomeView mounted, route params:', route.params)
  console.log('UUID from props:', props.uuid)
  console.log('UUID from route:', route.params.uuid)

  rotationInterval = setInterval(rotateExample, 4000) // Rotate every 4 seconds
  document.addEventListener('click', handleClickOutside);
  window.addEventListener('resize', handleResize);
  window.addEventListener('resize', checkMobileState);
  window.addEventListener('scroll', handleScroll);
  
  // Initialize mobile state
  checkMobileState();

  // Initialize session persistence service
  sessionPersistenceService.initialize()

  // Check for recoverable sessions
  checkForRecoverableSessions()

  // Load analysis if UUID is present in the route
  if (uuid.value && !hasAttemptedUuidLoad.value) {
    console.log('Loading analysis on mount for UUID:', uuid.value)
    hasAttemptedUuidLoad.value = true
    loadAnalysisFromUuid(uuid.value)
  }

  // Restore scroll position after all initialization is complete
  nextTick(() => {
    setTimeout(() => {
      restoreScrollPosition()
    }, 100) // Small delay to ensure content is fully loaded
  })

  // Show feature intro modal if not dismissed
  try {
    if (shouldShowFeatureIntro()) {
      // Slight delay so it doesn't clash with other UI on mount
      setTimeout(() => { showFeatureIntroModal.value = true }, 250)
    }
  } catch (e) {
    // no-op
  }
})

onUnmounted(() => {
  if (rotationInterval) {
    clearInterval(rotationInterval)
  }
  if (scrollSaveTimeout) {
    clearTimeout(scrollSaveTimeout)
  }
  document.removeEventListener('click', handleClickOutside);
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('resize', checkMobileState);
  window.removeEventListener('scroll', handleScroll);
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

    await startFactCheck(inputText.value, uploadedFile.value, selectedMode.value, selectedStyle.value)

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
watch([results, originalClaim], async ([newResults, newOriginalClaim]) => {
  console.log('🎯 Watch triggered - Results:', !!newResults, 'OriginalClaim:', !!newOriginalClaim, 'Loading:', isLoading.value)
  console.log('🔍 Results type:', typeof newResults, 'Claim type:', typeof newOriginalClaim)
  console.log('📋 Results content:', newResults ? Object.keys(newResults) : 'null')
  console.log('🚩 isLoadingSavedAnalysis:', isLoadingSavedAnalysis.value)
  console.log('🔄 isRecoveringSession:', isRecoveringSession.value)
  console.log('🔍 Original claim value:', newOriginalClaim)
  console.log('🔍 Original claim length:', newOriginalClaim?.length)
  console.log('🔍 Original claim truthy:', !!newOriginalClaim)

  // Only save if this is a new analysis completion, not loading an existing one
  if (newResults && newOriginalClaim && !isLoading.value && !isLoadingSavedAnalysis.value && !isRecoveringSession.value) {
    console.log('💾 Attempting to save analysis:', newOriginalClaim.substring(0, 50))
    try {
      const analysisId = await saveAnalysis(newResults, newOriginalClaim, selectedMode.value, progressCollapsed.value, {
        percentage: progress.percentage,
        currentStep: progress.currentStep,
        stepNumber: progress.stepNumber,
        totalSteps: progress.totalSteps,
        completedSteps: progress.completedSteps,
        failedSteps: progress.failedSteps,
        expectedSteps: progress.expectedSteps,
        steps: [...progress.steps]
      }, sessionId.value)
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

  // Clear saved scroll position for fresh start
  try {
    localStorage.removeItem(SCROLL_STORAGE_KEY)
  } catch (error) {
    console.warn('Failed to clear scroll position:', error)
  }

  // Navigate to home if we're currently on an analysis page
  if (route.params.uuid) {
    router.push('/')
  }
}

const handleLogoClick = () => {
  handleNewAnalysis()
  // Scroll to top smoothly and clear saved position
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const toggleMobileMenu = () => {
    // Only allow mobile menu toggle on mobile devices
    if (window.innerWidth <= 768) {
        isMobileMenuOpen.value = !isMobileMenuOpen.value;
    }
};

const handleSelectSavedAnalysisAndCloseMenu = (analysis) => {
    handleSelectSavedAnalysis(analysis);
    isMobileMenuOpen.value = false;
};

// Handle window resize to close mobile menu when switching to desktop
const handleResize = () => {
  if (window.innerWidth > 768 && isMobileMenuOpen.value) {
    isMobileMenuOpen.value = false;
  }
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

    // CRITICAL FIX: Set the selectedMode BEFORE recovering the session
    // This ensures the correct component (ResearchResults vs FactCheckResults) is rendered
    selectedMode.value = sessionData.mode || 'fact_check'

    // Reset current state and recover session
    await recoverSession(sessionData)

    // Update UI state
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

// Function to extract report content for AI Quick Ask
const getReportContent = () => {
  if (!results.value) return ''
  
  try {
    // For fact-check mode, extract relevant content
    if (selectedMode.value === 'fact_check') {
      const { verdict, confidence_score, summary, reasoning, sources } = results.value
      return `Verdict: ${verdict}\nConfidence: ${confidence_score}\nSummary: ${summary}\nReasoning: ${reasoning}\nSources: ${sources ? JSON.stringify(sources) : 'None'}`
    }
    
    // For research mode, extract summary content
    if (selectedMode.value === 'research' && results.value.summary) {
      // If summary is an array of sections, extract text content
      if (Array.isArray(results.value.summary)) {
        return results.value.summary.map(section => {
          const title = section.title || ''
          const content = section.content || ''
          return `${title}\n${content}`
        }).join('\n\n')
      }
      
      // If summary is a string, return as is
      if (typeof results.value.summary === 'string') {
        return results.value.summary
      }
    }
    
    // Fallback: stringify the entire results object
    return JSON.stringify(results.value, null, 2)
  } catch (error) {
    console.error('Error extracting report content:', error)
    return 'Unable to extract report content'
  }
}
</script>

<template>
  <Layout class="main-layout" :lang="locale === 'zh' ? 'zh-CN' : 'en'">
    <Header class="header" :class="{ 'mobile-expanded': isMobileMenuOpen }">
      <div class="header-content">
        <div class="header-row-primary">
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
               <Button
                 class="settings-button"
                 @click="showSettingsModal = true"
                 size="small"
               >
                 <Settings class="settings-icon" :size="14" />
                 <span class="settings-label">{{$t('settings.title')}}</span>
               </Button>
            </div>
            <Button
              class="mobile-menu-button"
              @click="toggleMobileMenu"
              :class="{ 'is-active': isMobileMenuOpen }"
            >
              ☰
            </Button>
          </div>
        </div>
        <div class="header-row-secondary" :class="{ 'collapsed': !isMobileMenuOpen }">
          <div class="secondary-content">
            <SavedAnalysesDropdown @select-analysis="handleSelectSavedAnalysisAndCloseMenu" />
            <Button
              class="settings-button"
              @click="showSettingsModal = true"
              size="small"
            >
              <span class="settings-icon">⚙️</span>
              <span class="settings-label">Settings</span>
            </Button>
          </div>
        </div>
      </div>
    </Header>
    <Content class="content">
      <div class="main-container">
        <div class="hero-section">
          <Title level="1" class="main-title">
            {{ selectedMode === 'fact_check' ? t('app.title') : t('app.researchTitle') }}
            <span v-if="maxMode" class="max-mode-indicator">MAX</span>
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
              <div class="ai-ppt-indicator" :class="{ 'fact-check-mode': selectedMode === 'fact_check' }">
                <Presentation class="ai-icon" :size="16" />
                <span class="ai-text">AI PPT</span>
              </div>
              <div class="input-controls">
                <!-- Show upload button for fact-check mode -->
                <template v-if="selectedMode === 'fact_check'">
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
                </template>

                <!-- Show style selector for research mode -->
                <template v-if="selectedMode === 'research'">
                  <div class="style-selector">
                    <label class="style-label">Style:</label>
                    <Select
                      v-model:value="selectedStyle"
                      class="style-select"
                      size="small"
                    >
                      <Select.Option value="professional">
                        <Tooltip title="Formal, detailed analysis with comprehensive citations and structured presentation suitable for academic or business contexts" placement="right">
                          <span>📊 Professional</span>
                        </Tooltip>
                      </Select.Option>
                      <Select.Option value="informational">
                        <Tooltip title="Clear, accessible explanations with balanced depth and readability for general audiences" placement="right">
                          <span>📚 Informational</span>
                        </Tooltip>
                      </Select.Option>
                      <Select.Option value="concise">
                        <Tooltip title="Brief, focused summary highlighting key points and essential findings" placement="right">
                          <span>⚡ Concise</span>
                        </Tooltip>
                      </Select.Option>
                    </Select>
                  </div>
                </template>
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

      <div v-if="results" class="results-layout-wrapper" :class="{ 'has-toc': showToc, 'has-ai-ask': showToc }">
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
            :analysisSummary="currentAnalysisSummary"
            @headings-extracted="handleHeadingsExtracted"
          />
          <ResearchResults
            v-else
            :results="results"
            :originalClaim="originalClaim"
            :sessionId="sessionId"
            :analysisSummary="currentAnalysisSummary"
            @headings-extracted="handleHeadingsExtracted"
            @section-updated="handleSectionUpdated"
            @open-ppt-generator="handleOpenPPTGenerator"
            :key="`research-${sessionId}`"
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
        <div v-if="showToc" class="ai-ask-wrapper">
          <AIContainer
            ref="aiContainerRef"
            :sessionId="effectiveSessionId"
            :reportContent="getReportContent()"
            :visible="showToc"
          />
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

    <!-- Mobile AI Tools Button -->
    <Transition name="ai-tools">
      <div v-if="showAIToolsMenu" class="ai-tools-container">
        <!-- AI Tools Popup -->
        <Transition name="ai-tools-popup">
          <div v-if="isAIToolsPopupOpen" class="ai-tools-popup">
            <button 
              class="ai-tool-button ai-quick-ask-button"
              @click="openAIQuickAsk"
              aria-label="Open AI Quick Ask"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <span>AI Quick Ask</span>
            </button>
            <button 
              class="ai-tool-button ai-ppt-button disabled"
              @click="openAIPPT"
              aria-label="AI PPT Generator (Coming Soon)"
              disabled
            >
              <Presentation :size="18" />
              <span>AI PPT <small>(Soon)</small></span>
            </button>
          </div>
        </Transition>
        
        <!-- Main AI Tools Button -->
        <button
          class="ai-tools-button"
          @click="toggleAIToolsPopup"
          :class="{ 'active': isAIToolsPopupOpen }"
          aria-label="AI Tools Menu"
        >
          <svg v-if="!isAIToolsPopupOpen" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M20 12h.01"/>
            <path d="M4 12h.01"/>
            <path d="M12 20v.01"/>
            <path d="M12 4v.01"/>
          </svg>
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </Transition>

    <!-- Back to Top Button -->
    <Transition name="back-to-top">
      <button
        v-if="showBackToTop"
        class="back-to-top-button"
        @click="scrollToTop"
        aria-label="Back to top"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m18 15-6-6-6 6"/>
        </svg>
      </button>
    </Transition>

    <!-- Text Selection Popup for AI Citation -->
    <TextSelectionPopup
      :visible="true"
      :isSessionReady="!!effectiveSessionId"
      @ask-ai="handleTextSelection"
    />

    <!-- Settings Modal -->
    <SettingsModal
      :visible="showSettingsModal"
      @close="showSettingsModal = false"
      @show-feature-intro="handleShowFeatureIntro"
    />

    <!-- Feature Intro Modal: GPT-5 + AI PPT -->
    <a-modal
      v-model:open="showFeatureIntroModal"
      :title="null"
      width="640px"
      :footer="null"
      :mask-closable="true"
      :destroy-on-close="true"
      :closable="false"
      @cancel="dismissFeatureIntroForOneDay"
    >
      <div class="feature-intro">
        <div class="feature-hero">
          <div class="hero-badge">Update</div>
          <h2 class="hero-title">GPT‑5 + AI PPT</h2>
          <p class="hero-subtitle">Smarter research. Beautiful slides. Faster results.</p>
          <img
            class="hero-logo"
            src="/logoLight.png"
            alt="Logo"
          />
        </div>

        <div class="feature-grid">
          <div class="feature-card">
            <div class="card-icon card-icon-gradient">
              <img
                class="openai-logo"
                height="18"
                src="https://registry.npmmirror.com/@lobehub/icons-static-png/latest/files/dark/openai.png"
                alt="OpenAI"
              />
            </div>
            <div class="card-content">
              <h4 class="card-title">GPT‑5 Integration</h4>
              <ul class="card-points">
                <li>Deeper reasoning and higher factual accuracy</li>
                <li>Faster, more reliable responses in both modes</li>
              </ul>
            </div>
          </div>

          <div class="feature-card">
            <div class="card-icon card-icon-accent">
              <Presentation :size="18" />
            </div>
            <div class="card-content">
              <h4 class="card-title">AI PPT Generation <span class="pill">BETA</span></h4>
              <ul class="card-points">
                <li>Turn research into polished, downloadable slides</li>
                <li>Visual edits, quick regeneration, export to PDF</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="feature-actions">
          <button class="feature-btn ghost" @click="dismissFeatureIntroForOneDay">Close for one day</button>
          <button class="feature-btn solid" @click="dismissFeatureIntroForever">Don't show again</button>
        </div>
      </div>
    </a-modal>
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
  transition: height 0.25s ease-out;
}

.header.mobile-expanded {
  height: 140px;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  height: 100%;
  display: grid;
  grid-template-rows: 80px 1fr;
  align-items: center;
}

.header-row-primary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 80px;
}

.header-row-secondary {
  display: none; /* Hidden on desktop by default */
}

.header-row-secondary .secondary-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 12px 0;
  min-height: 0;
  opacity: 1;
  filter: blur(0);
  transition: padding 0.2s ease, opacity 0.2s ease, filter 0.2s ease;
  position: relative;
  z-index: 1001;
}

/* Allow dropdowns in mobile header to extend beyond header boundaries */
.header.mobile-expanded .header-row-secondary {
  overflow: visible;
}

.header.mobile-expanded .header-row-secondary .secondary-content {
  overflow: visible;
}

/* Ensure dropdown components in mobile header have proper z-index and positioning */
@media (max-width: 768px) {
  .header.mobile-expanded .saved-analyses-dropdown {
    position: static;
  }

  .header.mobile-expanded .saved-analyses-dropdown .dropdown-menu {
    position: fixed;
    top: auto;
    right: 16px;
    left: 16px;
    z-index: 1100;
    transform: translateY(8px);
    min-width: auto;
    max-width: none;
    width: auto;
    margin: 0;
  }

  /* Ensure the header doesn't clip dropdowns when expanded */
  .header.mobile-expanded {
    overflow: visible;
  }

  .header.mobile-expanded .header-content {
    overflow: visible;
  }

  .header.mobile-expanded .header-row-secondary {
    overflow: visible;
    z-index: 1050;
  }

  .header.mobile-expanded .header-row-secondary .secondary-content {
    overflow: visible;
    z-index: 1050;
  }
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

.settings-button {
  height: 32px !important;
  border-radius: 6px !important;
  background: #f8f9fa !important;
  border: 1px solid #d9d9d9 !important;
  color: #666666 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: all 0.2s ease !important;
  padding: 0 12px !important;
  min-width: auto !important;
  gap: 6px !important;
}

.settings-button:hover {
  background: #e9ecef !important;
  border-color: #757575 !important;
  color: #495057 !important;
}

.settings-icon {
  font-size: 14px;
}

.settings-label {
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 13px;
  font-weight: 500;
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

.results-layout-wrapper.has-ai-ask {
    grid-template-columns: 260px 1fr 260px;
    grid-template-areas: "toc-area report ai-ask-area";
    gap: 40px;
    max-width: 1400px;
    margin-left: auto;
    margin-right: auto;
}

.results-layout-wrapper.has-ai-ask .results-content-area {
    max-width: 700px;
    margin: 0 auto;
    justify-self: center;
}

.toc-wrapper {
    grid-area: left-gutter;
    justify-self: end;
}

.results-layout-wrapper.has-ai-ask .toc-wrapper {
    grid-area: toc-area;
    justify-self: start;
}

.ai-ask-wrapper {
    grid-area: ai-ask-area;
    justify-self: start;
    display: flex;
    flex-direction: column;
    gap: 20px; /* Increased gap to prevent overlap */
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
  position: relative;
  display: inline-block;
  padding: 0 52px;
}


.max-mode-indicator {
  position: absolute;
  bottom: 8px;
  right: 0;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 5px;
  border: 1px solid #757575;
  font-family: 'DM Sans', 'LXGW WenKai', serif;
  letter-spacing: 0.5px;
  transition: all 0.2s ease;
    background: #e9ecef;
  color: #495057;
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

.ai-ppt-indicator {
  position: absolute;
  bottom: 12px;
  left: 12px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: #ff8c00;
  transition: all 0.2s ease;
  pointer-events: none;
}

.ai-ppt-indicator.fact-check-mode {
  color: #999999;
}

.ai-ppt-indicator.fact-check-mode .ai-icon {
  opacity: 0.6;
}

.ai-icon {
  font-size: 16px;
  line-height: 1;
}

.ai-text {
  font-weight: 600;
  letter-spacing: 0.3px;
}

.input-controls {
  position: absolute;
  bottom: 12px;
  right: 12px;
  z-index: 10;
}

.upload-button,
.style-selector {
  height: auto;
  padding: 4px 12px;
  font-size: 14px;
  border-radius: 6px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  color: #666666;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  transition: all 0.2s ease;
}

.upload-button:hover,
.style-selector:hover {
  background: #e9ecef;
  border-color: #dee2e6;
  color: #495057;
}


.upload-button:hover {
  background: #e9ecef !important;
  border-color: #dee2e6 !important;
  color: #495057 !important;
}

.style-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 4px 12px;
  transition: all 0.2s ease;
}

.style-selector:hover {
  background: #e9ecef;
  border-color: #dee2e6;
}


.style-label {
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 14px;
  color: #666666;
  margin: 0;
  white-space: nowrap;
  font-weight: normal;
}


.style-select {
  width: 140px;
  min-width: 140px;
  max-width: 140px;
  flex-shrink: 0;
}


.style-select .ant-select-selector {
  background: transparent !important;
  border: none !important;
  border-radius: 0 !important;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif !important;
  font-size: 14px !important;
  padding: 0 !important;
  height: auto !important;
  box-shadow: none !important;
  min-height: auto !important;
}

.style-select .ant-select-selector:hover {
  background: transparent !important;
  border: none !important;
}

.style-select .ant-select-selection-item {
  color: #666666 !important;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif !important;
  font-size: 14px !important;
  padding-right: 0 !important;
}

.style-select .ant-select-arrow {
  color: #666666 !important;
  right: 0 !important;
}

.style-select:hover .ant-select-selection-item,
.style-selector:hover .style-label,
.style-selector:hover .ant-select-arrow {
  color: #495057 !important;
}

.style-select.ant-select-focused .ant-select-selector {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}


.style-select .ant-select-selector {
  background: #f8f9fa !important;
  border: 1px solid #e9ecef !important;
  border-radius: 6px !important;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif !important;
  font-size: 14px !important;
  padding: 4px 12px !important;
  height: auto !important;
  transition: all 0.2s ease !important;
}

.style-select .ant-select-selector:hover {
  background: #e9ecef !important;
  border-color: #dee2e6 !important;
}

.style-select .ant-select-selection-item {
  color: #666666 !important;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif !important;
  font-size: 14px !important;
}

.style-select:hover .ant-select-selector {
  background: #e9ecef !important;
  border-color: #dee2e6 !important;
}

.style-select .ant-select-selection-item:hover {
  color: #495057 !important;
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


/* Feature Intro Modal Styles */
.feature-intro {
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
}

.feature-hero {
  position: relative;
  background: radial-gradient(1200px 240px at 20% -20%, #e6f0ff 0%, transparent 60%),
              linear-gradient(135deg, #0ea5e9 0%, #6366f1 60%, #8b5cf6 100%);
  border-radius: 12px;
  padding: 28px 24px;
  color: white;
  overflow: hidden;
  box-shadow: 0 6px 24px rgba(13, 110, 253, 0.15);
}

.hero-badge {
  display: inline-block;
  background: rgba(255, 255, 255, 0.2);
  color: #f8fafc;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.4px;
  margin-bottom: 10px;
  backdrop-filter: blur(6px);
}

.hero-title {
  font-family: 'Playfair Display', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.4px;
  margin: 0 0 6px 0;
}

.hero-subtitle {
  margin: 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.95);
}

.hero-logo {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  height: 150px;
  width: auto;
  opacity: 0.95;
  filter: drop-shadow(0 6px 16px rgba(0,0,0,0.15));
}

@media (max-width: 640px) {
  .hero-logo {
    height: 72px;
    right: 12px;
  }
}

.feature-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 16px;
}

.feature-card {
  display: flex;
  gap: 12px;
  background: #ffffff;
  border: 1px solid #eef2f7;
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.feature-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
  border-color: #dfe6ee;
}

.card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  flex-shrink: 0;
}

.card-icon-gradient {
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  color: white;
}

.card-icon-accent {
  background: linear-gradient(135deg, #10b981, #34d399);
  color: white;
}

.icon-emoji {
  font-size: 18px;
}

.openai-logo {
  display: block;
  width: 16px;
  height: 16px;
}

.card-content {
  flex: 1;
}

.card-title {
  margin: 0 0 6px 0;
  font-family: 'Playfair Display', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}

.pill {
  display: inline-block;
  margin-left: 6px;
  font-size: 10px;
  letter-spacing: 0.4px;
  background: #111827;
  color: white;
  padding: 1px 6px;
  border-radius: 999px;
  vertical-align: middle;
}

.card-points {
  margin: 0;
  padding-left: 18px;
  color: #475569;
  font-size: 13px;
  line-height: 1.6;
}

.feature-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

.feature-btn {
  border-radius: 10px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.feature-btn.ghost {
  background: #ffffff;
  color: #0f172a;
  border-color: #e5e7eb;
}

.feature-btn.ghost:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.feature-btn.solid {
  background: #000000;
  color: #ffffff;
  border-color: #000000;
}

.feature-btn.solid:hover {
  background: #1f2937;
  border-color: #1f2937;
}

@media (max-width: 640px) {
  .feature-grid {
    grid-template-columns: 1fr;
  }
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
    
    .results-layout-wrapper.has-ai-ask {
        grid-template-columns: 1fr;
        grid-template-areas:
            "toc-area"
            "report"
            "ai-ask-area";
        max-width: 700px;
        margin-left: auto;
        margin-right: auto;
        gap: 0;
    }
    
    .ai-ask-wrapper {
        justify-self: stretch;
        margin-top: 16px;
    }
    .toc-wrapper {
        /* Make the whole TOC section sticky on mobile */
        position: sticky;
        top: 80px; /* Sticking point for tablets */
        z-index: 90;

        /* Visuals for floating state with enhanced transparency and blur */
        background: rgba(255, 255, 255, 0.65); /* More transparent background */
        backdrop-filter: blur(8px) saturate(1.2);
        -webkit-backdrop-filter: blur(8px) saturate(1.2); /* For Safari */

        /* Layout adjustments for full-width sticky bar */
        justify-self: stretch;
        /* Remove negative margin that causes overflow */
        margin: 0;
        padding: 0 24px; /* Match parent container padding */
        /* Ensure it doesn't exceed viewport width */
        max-width: 100%;
        box-sizing: border-box;

        transition: background-color 0.3s ease, border-color 0.3s ease;
        mask: linear-gradient(to bottom, white calc(100% - 10px), transparent 100%);
        -webkit-mask: linear-gradient(to bottom, white calc(100% - 10fpx), transparent 100%);
    }

    .toc-wrapper.is-collapsed {
        background-color: rgba(248, 249, 250, 0.7);

        /* Gradient mask for fade-out effect at bottom */

        mask: linear-gradient(to bottom, white 75%, transparent 100%);
        -webkit-mask: linear-gradient(to bottom, white 75%, transparent 100%);
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

  .header.mobile-expanded {
    height: 130px;
  }

  .header-content {
    padding: 0 16px;
    grid-template-rows: 70px auto;
  }

  .header-row-primary {
    height: 70px;
  }

  .header-row-secondary {
    border-top-color: #f0f0f0;
    display: grid;
  }

  .header-row-secondary.collapsed {
    grid-template-rows: 0fr;
    border-top-color: transparent;
  }
  .header-row-secondary .secondary-content {
    padding: 8px 0 12px 0;
  }

  .header-row-secondary.collapsed {
    opacity: 0;
    transform: translateY(-10px);
    max-height: 0;
    padding-top: 0;
    padding-bottom: 0;
    margin-top: 0;
    margin-bottom: 0;
    overflow: hidden;
    pointer-events: none; /* Prevent interaction when collapsed */
  }

  .header-row-secondary.collapsed .secondary-content {
    padding-top: 0;
    padding-bottom: 0;
    opacity: 0;
    filter: blur(4px);
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

  .main-title {
    font-size: 36px !important;
  }

  .max-mode-indicator {
    font-size: 8px;
    padding: 1px 4px;
    bottom: 2px;
    right: 0;
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

/* Back to Top Button Styles */
.back-to-top-button {
  position: fixed;
  bottom: 32px;
  right: 32px;
  width: 56px;
  height: 56px;
  background: #000000;
  color: #ffffff;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1000;
  font-size: 0;
}

.back-to-top-button:hover {
  background: #333333;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
}

.back-to-top-button:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.back-to-top-button svg {
  transition: transform 0.2s ease;
}

.back-to-top-button:hover svg {
  transform: translateY(-1px);
}

/* Transition animations */
.back-to-top-enter-active,
.back-to-top-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.back-to-top-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.8);
}

.back-to-top-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.8);
}

/* AI Tools Button Styles */
.ai-tools-container {
  position: fixed;
  bottom: 100px;
  right: 32px;
  z-index: 1001;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}

.ai-tools-button {
  width: 56px;
  height: 56px;
  background: #000000;
  color: #ffffff;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0;
}

.ai-tools-button:hover {
  background: #333333;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
}

.ai-tools-button:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.ai-tools-button.active {
  background: #1890ff;
  transform: rotate(45deg);
}

.ai-tools-button.active:hover {
  background: #40a9ff;
}

.ai-tools-button svg {
  transition: transform 0.2s ease;
  pointer-events: none;
}

.ai-tools-button:hover svg {
  transform: translateY(-1px);
}

.ai-tools-button.active svg {
  transform: none;
}

/* AI Tools Popup */
.ai-tools-popup {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.ai-tool-button {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 28px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 14px;
  font-weight: 500;
  color: #000000;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-width: 160px;
}

.ai-tool-button:hover:not(.disabled) {
  background: #f8f9fa;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.ai-tool-button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  color: #999999;
}

.ai-tool-button svg {
  flex-shrink: 0;
  color: #666666;
  pointer-events: none;
}

.ai-tool-button.ai-quick-ask-button svg {
  color: #1890ff;
}

.ai-tool-button.ai-ppt-button svg {
  color: #ff6b35;
}

.ai-tool-button span {
  pointer-events: none;
}

.ai-tool-button span small {
  font-size: 11px;
  color: #999999;
  font-weight: 400;
  pointer-events: none;
}

/* AI Tools Transitions */
.ai-tools-enter-active,
.ai-tools-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.ai-tools-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.8);
}

.ai-tools-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.8);
}

.ai-tools-popup-enter-active,
.ai-tools-popup-leave-active {
  transition: all 0.2s ease;
}

.ai-tools-popup-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.95);
}

.ai-tools-popup-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.95);
}

@media (max-width: 768px) {
  .back-to-top-button {
    bottom: 24px;
    right: 24px;
    width: 48px;
    height: 48px;
  }

  .back-to-top-button svg {
    width: 18px;
    height: 18px;
  }

  .ai-tools-container {
    bottom: 84px;
    right: 24px;
  }

  .ai-tools-button {
    width: 48px;
    height: 48px;
  }

  .ai-tools-button svg {
    width: 18px;
    height: 18px;
  }

  .ai-tool-button {
    min-width: 140px;
    font-size: 13px;
    padding: 10px 14px;
  }

  .ai-tool-button svg {
    width: 16px;
    height: 16px;
  }
}
</style>
