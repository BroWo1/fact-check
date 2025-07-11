import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { notification } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'

const STORAGE_KEY = 'fact-check-analyses'

// Main reactive state for all analyses, shared across the app
const savedAnalyses = ref([])

// --- Private utility functions ---

/**
 * Loads analyses from localStorage into the reactive state.
 * Sorts them by timestamp descending to ensure newest are first.
 */
const loadAnalyses = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      savedAnalyses.value = JSON.parse(stored).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    }
  } catch (e) {
    console.error('Failed to load or parse saved analyses:', e)
    savedAnalyses.value = []
  }
}

/**
 * Persists the current state of analyses to localStorage.
 */
const persistAnalyses = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedAnalyses.value))
  } catch (e) {
    console.error('Failed to save analyses to localStorage:', e)
  }
}

// Initial load when the module is first imported
loadAnalyses()

/**
 * Composable for managing saved fact-check analyses.
 */
export function useSavedAnalyses() {
  const { t } = useI18n()

  // --- Computed properties ---

  const hasAnalyses = computed(() => savedAnalyses.value.length > 0)
  const recentAnalyses = computed(() => savedAnalyses.value.slice(0, 10))

  // --- Core methods ---

  /**
   * Saves a new analysis or updates an existing one for the same claim.
   * @param {object} results - The analysis results object.
   * @param {string} originalClaim - The original claim text.
   * @param {string} mode - The mode used ('fact_check' or 'research').
   */
  const saveAnalysis = (results, originalClaim, mode = 'fact_check') => {
    const normalizedClaim = originalClaim.trim().toLowerCase()

    // Find and remove an existing analysis for the same claim to prevent duplicates
    const existingAnalysisIndex = savedAnalyses.value.findIndex(
      (analysis) => analysis.originalClaim.trim().toLowerCase() === normalizedClaim
    )

    if (existingAnalysisIndex > -1) {
      savedAnalyses.value.splice(existingAnalysisIndex, 1)
    }

    const newAnalysis = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      results,
      originalClaim,
      verdict: results.verdict,
      mode, // Add mode information
    }
    
    // Add the new/updated analysis to the beginning of the array
    savedAnalyses.value.unshift(newAnalysis)
    persistAnalyses()
  }

  const deleteAnalysis = (analysisId) => {
    savedAnalyses.value = savedAnalyses.value.filter(a => a.id !== analysisId)
    persistAnalyses()
    notification.success({
      message: t('savedAnalyses.analysisDeleted'),
      duration: 2
    })
  }

  const clearAllAnalyses = () => {
    savedAnalyses.value = []
    persistAnalyses()
    notification.success({
      message: t('savedAnalyses.allAnalysesCleared'),
      duration: 2
    })
  }

  // --- Formatting and display helpers ---

  const formatAnalysisForDisplay = (analysis) => {
    const shortClaim = analysis.originalClaim.length > 100
      ? `${analysis.originalClaim.substring(0, 100)}...`
      : analysis.originalClaim
      
    const displayDate = new Date(analysis.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    
    const confidencePercent = Math.round((analysis.results.confidence_score || 0) * 100)
    
    return { shortClaim, displayDate, confidencePercent }
  }

  const getVerdictIcon = (verdict) => ({'true':'✅','likely_true':'👍','likely':'👍','uncertain':'❓','likely_false':'👎','suspicious':'⚠️','false':'❌'}[verdict]||'❓')
  const getVerdictColor = (verdict) => ({'true':'#22c55e','likely_true':'#84cc16','likely':'#84cc16','uncertain':'#f59e0b','likely_false':'#f97316','suspicious':'#ef4444','false':'#ef4444'}[verdict]||'#6b7280')

  return { savedAnalyses, hasAnalyses, recentAnalyses, saveAnalysis, deleteAnalysis, clearAllAnalyses, formatAnalysisForDisplay, getVerdictIcon, getVerdictColor }
}