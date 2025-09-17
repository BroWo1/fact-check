<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue'
import { Presentation, Settings, Files, Folder } from 'lucide-vue-next'
import { Bug } from 'lucide-vue-next';
import { useRoute, useRouter } from 'vue-router'
import { Input, Button, Typography, Space, Layout, Upload, notification, Modal, Select, Tooltip } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { useFactCheck } from '../composables/useFactCheck'
import { useSavedAnalyses } from '../composables/useSavedAnalyses'
import { useSessionRecovery } from '../composables/useSessionRecovery'
import { useWorkspace } from '../composables/useWorkspace'
import AnalysisProgress from '../components/Progress2.vue'
import FactCheckResults from '../components/FactCheckResults.vue'
import ResearchResults from '../components/ResearchResults.vue'
import DefineResults from '../components/DefineResults.vue'
import LanguageSelector from '../components/LanguageSelector.vue'
import SavedAnalysesDropdown from '../components/SavedAnalysesDropdown.vue'
import ModeSelector from '../components/ModeSelector.vue'
import SessionRecoveryDialog from '../components/SessionRecoveryDialog.vue'
import NotificationPermissionBanner from '../components/NotificationPermissionBanner.vue'
import TableOfContents from '../components/TableOfContents.vue'
import AIContainer from '../components/AIContainer.vue'
import TextSelectionPopup from '../components/TextSelectionPopup.vue'
import SettingsModal from '../components/SettingsModal.vue'
import BugReportModal from '../components/BugReportModal.vue'
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

  // Mark that the current view originated from a saved analysis
  loadedFromSavedAnalysis.value = true

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
const showBugReportModal = ref(false)

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

// Create new workspace and navigate to it
const createNewWorkspace = () => {
  const workspace = createWorkspace('New Workspace')
  router.push(`/workspace/${workspace.id}`)
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
  document.title = newMode === 'fact_check' ? t('app.title') : (newMode === 'research' ? t('app.researchTitle') : t('app.defineTitle'))
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

// Workspace integration
const { createWorkspace } = useWorkspace()

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
// When viewing a previously saved analysis, dock the input at the bottom
const loadedFromSavedAnalysis = ref(false)
// Hide mode selector when viewing a previously saved analysis or while it's loading
const showModeSelector = computed(() => !loadedFromSavedAnalysis.value && !isLoadingSavedAnalysis.value)

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
  },
  define: {
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
const isMobile = ref(typeof window !== 'undefined' ? window.innerWidth <= 1200 : false)

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
  // Close popup first
  closeAIToolsPopup()
  // Trigger the mobile PPT generator overlay through a custom event with a small delay
  setTimeout(() => {
    console.log('Dispatching open-ai-ppt-mobile event')
    window.dispatchEvent(new CustomEvent('open-ai-ppt-mobile'))
  }, 100)
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

const defineExamples = ref([
  "Photosynthesis",
  "Blockchain",
  "Machine Learning",
  "Quantum Computing",
  "Inflation"
])

const currentExample = ref(examples.value[0])
let rotationInterval = null

// Suggestions removed per request

const rotateExample = () => {
  const activeExamples = selectedMode.value === 'fact_check' 
    ? examples.value 
    : (selectedMode.value === 'research' ? researchExamples.value : defineExamples.value)
  currentExampleIndex.value = (currentExampleIndex.value + 1) % activeExamples.length
  currentExample.value = activeExamples[currentExampleIndex.value]
}

// Watch for mode changes to reset examples and switch context
watch(selectedMode, (newMode, oldMode) => {
  const activeExamples = newMode === 'fact_check' 
    ? examples.value 
    : (newMode === 'research' ? researchExamples.value : defineExamples.value)
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
        progress.expectedSteps = modeData.progress.expectedSteps || (newMode === 'research' ? 4 : (newMode === 'define' ? 1 : 4))
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
      progress.expectedSteps = newMode === 'research' ? 4 : (newMode === 'define' ? 1 : 4)
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
    // Treat new submission as non-saved context
    loadedFromSavedAnalysis.value = false
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
      }, selectedMode.value === 'define' ? null : sessionId.value)
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
  loadedFromSavedAnalysis.value = false

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
    },
    define: {
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
              <Settings class="settings-icon" :size="14" />
              <span class="settings-label">{{$t('settings.title')}}</span>
            </Button>
          </div>
        </div>
      </div>
    </Header>
    <Content class="content">
      <div class="main-container">
        <div class="hero-section">
          <Title level="1" class="main-title">
            {{ selectedMode === 'fact_check' ? t('app.title') : (selectedMode === 'research' ? t('app.researchTitle') : t('app.defineTitle')) }}
            <span v-if="maxMode" class="max-mode-indicator">MAX</span>
          </Title>
          <Paragraph class="subtitle">
            {{ selectedMode === 'fact_check' ? t('app.subtitle') : (selectedMode === 'research' ? t('app.researchSubtitle') : t('app.defineSubtitle')) }}
          </Paragraph>
        </div>

        <ModeSelector v-if="showModeSelector" v-model:mode="selectedMode" />

        <div class="input-section" :class="{ 'fixed-bottom': loadedFromSavedAnalysis }">
          <Space direction="vertical" size="large" class="input-container">
            <!-- Local mask under the card only (not full width) -->
            <div v-if="loadedFromSavedAnalysis" class="ppx-mask" aria-hidden="true"></div>
            <!-- Perplexity-style card wrapper -->
            <div class="ppx-card">
              <div
                class="input-wrapper ppx-top"
                :class="{ 'drag-over': isDragOver }"
                @dragover="handleDragOver"
                @dragleave="handleDragLeave"
                @drop="handleDrop"
              >
                <Input.TextArea
                  v-model:value="inputText"
                  :placeholder="selectedMode === 'fact_check' ? t('app.inputPlaceholder') : (selectedMode === 'research' ? t('app.researchPlaceholder') : t('app.definePlaceholder'))"
                  :rows="loadedFromSavedAnalysis ? 3 : 6"
                  class="main-input ppx-input"
                  @keypress="handleKeyPress"
                  @paste="handlePaste"
                />
                <!-- Bottom control bar inside text box -->
                <div class="input-bottom-bar">
                  <div class="left-controls">
                    <div v-if="!loadedFromSavedAnalysis && selectedMode !== 'define'" class="ai-ppt-indicator" :class="{ 'fact-check-mode': selectedMode === 'fact_check' }">
                      <Presentation class="ai-icon" :size="16" />
                      <span class="ai-text">AI PPT</span>
                      <span class="ai-text" :class="{ enabled: selectedMode === 'research', disabled: selectedMode === 'fact_check' }">
                        {{ selectedMode === 'research' ? t('aiPPT.enabled') : t('aiPPT.disabled') }}
                      </span>
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
                      <template v-if="!loadedFromSavedAnalysis && selectedMode === 'research'">
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
                  </div>

                  <!-- Square send button on the right -->
                  <Button
                    type="primary"
                    class="submit-square"
                    :loading="isLoading"
                    :disabled="loadedFromSavedAnalysis || (!inputText.trim() && !uploadedFile)"
                    :title="loadedFromSavedAnalysis ? 'Disabled when viewing saved analysis' : ''"
                    @click="handleSubmit"
                    aria-label="Send"
                  >
                    <span v-if="!isLoading">→</span>
                    <span v-else>…</span>
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

              <!-- Suggestions removed -->
            </div>

            <!-- Submit button moved inside input box as square send -->

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

      <div v-if="results" class="results-layout-wrapper" :class="{ 'has-toc': showToc, 'has-ai-ask': showToc, 'hidden-when-docked': loadedFromSavedAnalysis }">
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
          <DefineResults
            v-else-if="selectedMode === 'define'"
            :results="results"
            :originalClaim="originalClaim"
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
      <div v-if="showAIToolsMenu && selectedMode !== 'define'" class="ai-tools-container">
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
              class="ai-tool-button ai-ppt-button"
              @click="openAIPPT"
              aria-label="AI PPT Generator"
            >
              <Presentation :size="18" />
              <span>AI PPT Generator</span>
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

    <!-- Bug Report Modal -->
    <BugReportModal
      :visible="showBugReportModal"
      @close="showBugReportModal = false"
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

  <!-- Bottom-left Workspace Button (hidden on mobile) -->
  <button
    v-if="!isMobile"
    class="workspace-button"
    @click="createNewWorkspace"
    aria-label="Create new workspace"
  >
    <span class="workspace-icon"><Folder class="ai-icon" :size="16" /></span>
    <span class="workspace-label">New Workspace</span>
    <span class="beta-badge">BETA</span>
  </button>

  <!-- Bottom-left Report Bugs Button (hidden on mobile) -->
  <button
    v-if="!isMobile"
    class="bug-report-button"
    @click="showBugReportModal = true"
    aria-label="Report bugs"
  >
    <span class="bug-icon"><Bug class="ai-icon" :size="16" /></span>
    <span class="bug-label">Report Bugs</span>
  </button>
</template>

<style scoped src="@/assets/styles/homeview/core.css"></style>
<style scoped src="@/assets/styles/homeview/input.css"></style>
<style scoped src="@/assets/styles/homeview/floating.css"></style>
