import { ref, computed, watch } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { notification } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import factCheckService from '../services/factCheckService'

const STORAGE_KEY = 'fact-check-analyses'

// Test localStorage functionality
const testLocalStorage = () => {
  try {
    const testKey = 'test-storage'
    const testValue = 'test-value'
    localStorage.setItem(testKey, testValue)
    const retrieved = localStorage.getItem(testKey)
    localStorage.removeItem(testKey)
    
    if (retrieved === testValue) {
      console.log('✅ localStorage is working correctly')
      return true
    } else {
      console.error('❌ localStorage test failed: value mismatch')
      return false
    }
  } catch (e) {
    console.error('❌ localStorage test failed:', e)
    return false
  }
}

// Run localStorage test
testLocalStorage()

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
    const dataToSave = JSON.stringify(savedAnalyses.value)
    console.log('💿 Persisting analyses to localStorage:', {
      count: savedAnalyses.value.length,
      dataSize: dataToSave.length,
      firstAnalysisId: savedAnalyses.value[0]?.id
    })
    localStorage.setItem(STORAGE_KEY, dataToSave)
    
    // Verify it was saved
    const verification = localStorage.getItem(STORAGE_KEY)
    if (verification) {
      const parsed = JSON.parse(verification)
      console.log('✅ localStorage verification successful:', parsed.length, 'analyses saved')
    } else {
      console.error('❌ localStorage verification failed: no data found')
    }
  } catch (e) {
    console.error('❌ Failed to save analyses to localStorage:', e)
  }
}

// Initial load when the module is first imported
loadAnalyses()

// Add debugging watcher for savedAnalyses changes
watch(savedAnalyses, (newValue, oldValue) => {
  console.log('savedAnalyses changed! Old length:', oldValue?.length || 0, 'New length:', newValue.length)
  console.log('Latest analysis:', newValue[0] ? {
    id: newValue[0].id,
    claim: newValue[0].originalClaim?.substring(0, 50),
    mode: newValue[0].mode
  } : 'none')
}, { deep: true })

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
   * Generates a summary for analysis content
   * @param {string} sessionId - The session ID
   * @param {string} originalClaim - The original claim
   * @param {object} results - The analysis results
   * @param {string} mode - The analysis mode
   */
  const generateAnalysisSummary = async (sessionId, originalClaim, results, mode) => {
    try {
      if (!sessionId) {
        console.warn('No sessionId available for summary generation')
        return null
      }

      const contentData = {
        originalClaim,
        content: mode === 'fact_check' ? results.reasoning || results.summary : results.summary,
        mode,
        verdict: results.verdict
      }

      const summaryResponse = await factCheckService.generateSummary(sessionId, contentData)
      return summaryResponse.summary || null
    } catch (error) {
      console.error('Failed to generate summary:', error)
      return null
    }
  }

  /**
   * Saves a new analysis or updates an existing one for the same claim.
   * @param {object} results - The analysis results object.
   * @param {string} originalClaim - The original claim text.
   * @param {string} mode - The mode used ('fact_check' or 'research').
   * @param {boolean} progressCollapsed - Whether the progress section is collapsed.
   * @param {object} progress - The progress data including steps and percentage.
   * @param {string} sessionId - Optional session ID for summary generation.
   */
  const saveAnalysis = async (results, originalClaim, mode = 'fact_check', progressCollapsed = true, progress = null, sessionId = null) => {
    console.log('🔄 saveAnalysis called with:', { 
      results: !!results, 
      originalClaim: originalClaim?.substring(0, 50), 
      mode, 
      progress: !!progress,
      sessionId: !!sessionId,
      currentArrayLength: savedAnalyses.value.length
    })
    
    if (!results || !originalClaim) {
      console.error('❌ saveAnalysis: Missing required parameters', { results: !!results, originalClaim: !!originalClaim })
      return null
    }
    
    const normalizedClaim = originalClaim.trim().toLowerCase()

    // Find existing analysis for the same claim
    const existingAnalysisIndex = savedAnalyses.value.findIndex(
      (analysis) => analysis.originalClaim.trim().toLowerCase() === normalizedClaim
    )

    let analysisId, originalTimestamp, existingSummary
    if (existingAnalysisIndex > -1) {
      // Preserve the existing UUID, timestamp, and summary when updating
      analysisId = savedAnalyses.value[existingAnalysisIndex].id
      originalTimestamp = savedAnalyses.value[existingAnalysisIndex].timestamp
      existingSummary = savedAnalyses.value[existingAnalysisIndex].summary
      console.log('📝 Updating existing analysis with preserved UUID and timestamp:', analysisId)
      savedAnalyses.value.splice(existingAnalysisIndex, 1)
    } else {
      // Generate new UUID only for truly new analyses
      analysisId = uuidv4()
      originalTimestamp = new Date().toISOString()
      existingSummary = null
      console.log('✨ Creating new analysis with UUID:', analysisId)
    }

    // Generate summary if not already available and sessionId is provided
    let summary = existingSummary
    if (!summary && sessionId) {
      try {
        summary = await generateAnalysisSummary(sessionId, originalClaim, results, mode)
        console.log('📝 Generated summary:', summary?.substring(0, 100) + '...')
      } catch (error) {
        console.warn('Failed to generate summary, proceeding without it:', error)
      }
    }

    const newAnalysis = {
      id: analysisId,
      timestamp: originalTimestamp, // Preserve original timestamp
      results,
      originalClaim,
      verdict: results.verdict,
      mode, // Add mode information
      progressCollapsed: true, // Always save as collapsed for auto-hide on reload
      progress, // Save progress data including steps
      summary, // Add generated summary
    }
    
    console.log('💾 About to save analysis:', {
      id: analysisId, 
      claim: originalClaim.substring(0, 50),
      verdict: results.verdict,
      hasSummary: !!summary,
      beforeLength: savedAnalyses.value.length
    })
    
    // Add the new/updated analysis to the beginning of the array
    savedAnalyses.value.unshift(newAnalysis)
    
    console.log('📊 After unshift, array length:', savedAnalyses.value.length)
    
    persistAnalyses()
    
    console.log('✅ Analysis saved, total analyses:', savedAnalyses.value.length)
    
    return analysisId // Return the ID so it can be used for navigation
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
    
    const shortSummary = analysis.summary && analysis.summary.length > 120
      ? `${analysis.summary.substring(0, 120)}...`
      : analysis.summary || ''
    
    return { shortClaim, displayDate, confidencePercent, shortSummary }
  }

  const getVerdictIcon = (verdict) => ({'true':'✅','likely_true':'👍','likely':'👍','uncertain':'❓','likely_false':'👎','suspicious':'⚠️','false':'❌'}[verdict]||'❓')
  const getVerdictColor = (verdict) => ({'true':'#22c55e','likely_true':'#84cc16','likely':'#84cc16','uncertain':'#f59e0b','likely_false':'#f97316','suspicious':'#ef4444','false':'#ef4444'}[verdict]||'#6b7280')

  return { savedAnalyses, hasAnalyses, recentAnalyses, saveAnalysis, deleteAnalysis, clearAllAnalyses, formatAnalysisForDisplay, getVerdictIcon, getVerdictColor }
}