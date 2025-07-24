import { ref, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import factCheckService from '../services/factCheckService'
import websocketService from '../services/websocketService'
import sessionPersistenceService from '../services/sessionPersistenceService'

export function useFactCheck() {
  const { t } = useI18n()
  const isLoading = ref(false)
  const sessionId = ref(null)
  
  // Debug sessionId changes
  watch(sessionId, (newValue, oldValue) => {
    console.log('🔍 useFactCheck - sessionId changed:', {
      old: oldValue,
      new: newValue,
      stack: new Error().stack
    })
  })
  const error = ref(null)
  const results = ref(null)
  const originalClaim = ref('')
  const isConnected = ref(false)
  const usePolling = ref(false)
  const currentMode = ref('fact_check') // Track current mode
  
  const progress = reactive({
    percentage: 0,
    currentStep: '',
    stepNumber: 0,
    totalSteps: 0,
    completedSteps: 0,
    failedSteps: 0,
    expectedSteps: 4, // Based on the 4-step process
    steps: []
  })

  // Loading state management
  const getLoadingStates = () => ({
    // Fact-check states
    'submitting': t('loading.submitting'),
    'initial_web_search': t('loading.initial_web_search'),
    'deeper_exploration': t('loading.deeper_exploration'),
    'source_credibility_evaluation': t('loading.source_credibility_evaluation'),
    'final_conclusion': t('loading.final_conclusion'),
    
    // Research states
    'topic_analysis': t('loading.topic_analysis'),
    'research_gathering': t('loading.research_gathering'),
    'source_analysis': t('loading.source_analysis'),
    'synthesis': t('loading.synthesis'),
    'report_generation': t('loading.report_generation')
  })

  let pollingInterval = null

  const resetState = () => {
    isLoading.value = false
    sessionId.value = null
    error.value = null
    results.value = null
    originalClaim.value = ''
    isConnected.value = false
    usePolling.value = false
    currentMode.value = 'fact_check'
    progress.percentage = 0
    progress.currentStep = ''
    progress.stepNumber = 0
    progress.totalSteps = 0
    progress.completedSteps = 0
    progress.failedSteps = 0
    progress.expectedSteps = 4
    progress.steps = []
    stopPolling()
  }

  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      pollingInterval = null
    }
  }

  // Debounced progress update to avoid too frequent UI updates
  let progressUpdateTimeout = null
  const debouncedProgressUpdate = (progressData) => {
    if (progressUpdateTimeout) clearTimeout(progressUpdateTimeout)
    progressUpdateTimeout = setTimeout(() => {
      updateProgress(progressData)
    }, 100)
  }

  const handleWebSocketMessage = (data) => {
    console.log('WebSocket message:', data)
    
    switch (data.type) {
      case 'initial_status':
        if (data.data) {
          debouncedProgressUpdate(data.data)
        }
        break
        
      case 'step_update':
        handleStepUpdate(data)
        break
        
      case 'progress_update':
        if (data.progress) {
          debouncedProgressUpdate(data.progress)
        }
        break
        
      case 'analysis_complete':
        handleAnalysisComplete(data.result)
        break
        
      case 'analysis_error':
        handleAnalysisError(data.error)
        break

      case 'analysis_cancelled':
        handleAnalysisCancelled(data.message)
        break
        
      case 'update':
        if (data.data) {
          handleUpdateMessage(data.data)
        }
        break
        
      default:
        console.log('Unknown WebSocket message type:', data.type)
    }
  }

  const handleStepUpdate = (stepData) => {
    // Update current step based on step type
    const stepType = stepData.step_type || stepData.stepType
    const loadingStates = getLoadingStates()
    progress.currentStep = loadingStates[stepType] || stepData.description || `Processing ${stepType}...`
    
    if (stepData.progress_percentage !== undefined) {
      progress.percentage = stepData.progress_percentage
    }
    
    // Update or add step to steps array
    updateStepInArray(stepData)
  }

  const handleUpdateMessage = (updateData) => {
    switch (updateData.type) {
      case 'progress_update':
        if (updateData.progress) {
          updateProgress(updateData.progress)
        }
        break
        
      case 'step_update':
        updateStep(updateData)
        break
        
      case 'analysis_complete':
        handleAnalysisComplete(updateData.result)
        break
        
      case 'analysis_error':
        handleAnalysisError(updateData.error)
        break
        
      default:
        console.log('Unknown update message type:', updateData.type)
    }
  }

  const updateStepInArray = (stepData) => {
    const stepNumber = stepData.step_number || stepData.stepNumber;
    if (!stepNumber) return;

    const existingStepIndex = progress.steps.findIndex(
      step => step.step_number === stepNumber
    );
    
    const loadingStates = getLoadingStates()
    const stepInfo = {
      step_number: stepNumber,
      description: stepData.description || loadingStates[stepData.step_type] || `Step ${stepNumber}`,
      status: stepData.status || 'in_progress',
      timestamp: new Date().toISOString(),
      summary: stepData.summary || null, // Add summary field
      ...stepData
    };
    
    if (existingStepIndex >= 0) {
      progress.steps[existingStepIndex] = { ...progress.steps[existingStepIndex], ...stepInfo };
    } else {
      progress.steps.push(stepInfo);
      progress.steps.sort((a, b) => a.step_number - b.step_number);
    }
  };

  const updateProgress = (progressData) => {
    console.log('Updating progress:', progressData)
    
    if (progressData.progress_percentage !== undefined) {
      progress.percentage = progressData.progress_percentage
    }
    if (progressData.current_step) {
      progress.currentStep = progressData.current_step.description || progressData.current_step
      progress.stepNumber = progressData.current_step.step_number || 0
    }
    if (progressData.step_description) {
      progress.currentStep = progressData.step_description
    }
    if (progressData.status) {
      // Map status to current step if no specific step is provided
      const loadingStates = getLoadingStates()
      if (!progress.currentStep && loadingStates[progressData.status]) {
        progress.currentStep = loadingStates[progressData.status]
      }
    }
    if (progressData.completed_steps !== undefined) {
      progress.completedSteps = progressData.completed_steps
    }
    if (progressData.total_steps !== undefined) {
      progress.totalSteps = progressData.total_steps
    }
    if (progressData.expected_steps !== undefined) {
      progress.expectedSteps = progressData.expected_steps
    }
    if (progressData.failed_steps !== undefined) {
      progress.failedSteps = progressData.failed_steps
    }
    if (progressData.steps) {
      progress.steps = progressData.steps
    }
    
    // Update session persistence with progress
    if (sessionId.value) {
      sessionPersistenceService.updateSessionProgress(sessionId.value, {
        percentage: progress.percentage,
        currentStep: progress.currentStep,
        steps: progress.steps,
        status: progressData.status || 'in_progress'
      })
    }
    
    // Only use calculated percentage as fallback if backend doesn't provide one
    if (progressData.progress_percentage === undefined && progress.totalSteps > 0) {
      const calculatedPercentage = (progress.completedSteps / progress.totalSteps) * 100
      progress.percentage = calculatedPercentage
    }
    
    if (progressData.steps && Array.isArray(progressData.steps)) {
        // Create a map for quick updates
        const existingSteps = new Map(progress.steps.map(s => [s.step_number, s]));

        progressData.steps.forEach(newStep => {
            const existing = existingSteps.get(newStep.step_number);
            if (existing) {
                // Merge new data into existing step
                Object.assign(existing, newStep);
            } else {
                // Add new step if it doesn't exist
                progress.steps.push(newStep);
            }
        });

        // Ensure steps are sorted
        progress.steps.sort((a, b) => a.step_number - b.step_number);
    }
  }

  const updateStep = (stepData) => {
    const stepType = stepData.step_type || stepData.stepType
    const loadingStates = getLoadingStates()
    progress.currentStep = loadingStates[stepType] || stepData.description || ''
    
    if (stepData.progress_percentage !== undefined) {
      progress.percentage = stepData.progress_percentage
    }
    
    updateStepInArray(stepData)
  }

  const handleAnalysisComplete = async (result) => {
    console.log('Analysis complete:', result)
    
    if (result.success && sessionId.value) {
      try {
        // Fetch the complete results
        const fullResults = await factCheckService.getResults(sessionId.value)
        results.value = fullResults
        
        // Ensure originalClaim is set if it's missing but available in results
        if (!originalClaim.value && fullResults.original_claim) {
          console.log('📝 Setting originalClaim from results:', fullResults.original_claim)
          originalClaim.value = fullResults.original_claim
        }
        
        progress.percentage = 100
        progress.currentStep = 'Analysis complete'
        
        // Set isLoading to false AFTER results are set to ensure proper watch trigger
        isLoading.value = false
        
        // Mark all steps as completed if they exist
        if (progress.steps && progress.steps.length > 0) {
          progress.steps.forEach(step => {
            if (step.status !== 'completed') {
              step.status = 'completed'
            }
          })
        }
        
        // Remove from active sessions
        sessionPersistenceService.removeActiveSession(sessionId.value)
      } catch (err) {
        console.error('Error fetching final results:', err)
        isLoading.value = false
        error.value = 'Failed to fetch final results'
      }
    } else {
      isLoading.value = false
      error.value = result.error || 'Analysis failed'
      // Remove failed session
      if (sessionId.value) {
        sessionPersistenceService.removeActiveSession(sessionId.value)
      }
    }
    
    // Disconnect WebSocket
    websocketService.disconnect()
    isConnected.value = false
  }

  const handleAnalysisError = (errorMessage) => {
    console.error('Analysis error:', errorMessage)
    isLoading.value = false
    error.value = errorMessage || 'An error occurred during analysis'
    
    // Remove failed session
    if (sessionId.value) {
      sessionPersistenceService.removeActiveSession(sessionId.value)
    }
    
    websocketService.disconnect()
    isConnected.value = false
  }

  const handleAnalysisCancelled = (message) => {
    console.log('Analysis cancelled:', message)
    isLoading.value = false
    error.value = null // Don't show cancellation as an error
    progress.currentStep = 'Analysis cancelled'
    
    // Remove cancelled session
    if (sessionId.value) {
      sessionPersistenceService.removeActiveSession(sessionId.value)
    }
    
    websocketService.disconnect()
    isConnected.value = false
  }

  const handleWebSocketError = (errorData) => {
    console.error('WebSocket error (ignored, using polling):', errorData)
    // WebSocket errors are ignored since we use polling as primary method
    isConnected.value = false
  }

  const startStatusPolling = () => {
    if (pollingInterval) {
      console.log('Polling already active, skipping start')
      return // Already polling
    }
    
    console.log('Starting status polling for session:', sessionId.value)
    
    pollingInterval = setInterval(async () => {
      if (!isLoading.value || !sessionId.value) {
        console.log('Stopping polling - loading finished or no session')
        stopPolling()
        return
      }

      try {
        console.log('Polling status for session:', sessionId.value)
        const status = await factCheckService.getStatus(sessionId.value)
        console.log('Polling response:', status)
        debouncedProgressUpdate(status)
        
        if (status.status === 'completed') {
          console.log('Analysis completed, fetching results')
          stopPolling()
          const fullResults = await factCheckService.getResults(sessionId.value)
          results.value = fullResults
          
          // Ensure originalClaim is set if it's missing but available in results
          if (!originalClaim.value && fullResults.original_claim) {
            console.log('📝 Setting originalClaim from results:', fullResults.original_claim)
            originalClaim.value = fullResults.original_claim
          }
          
          isLoading.value = false
          progress.percentage = 100
          progress.currentStep = 'Analysis complete'
          
          // Remove from active sessions
          sessionPersistenceService.removeActiveSession(sessionId.value)
        } else if (status.status === 'cancelled') {
          console.log('Analysis was cancelled')
          stopPolling()
          isLoading.value = false
          error.value = null // Don't show cancellation as an error
          progress.currentStep = 'Analysis cancelled'
          
          // Remove cancelled session
          sessionPersistenceService.removeActiveSession(sessionId.value)
        } else if (status.status === 'failed') {
          console.log('Analysis failed:', status.error)
          stopPolling()
          isLoading.value = false
          error.value = status.error || 'Analysis failed'
          
          // Remove failed session
          sessionPersistenceService.removeActiveSession(sessionId.value)
        } else {
          console.log('Analysis in progress, status:', status.status)
        }
      } catch (err) {
        console.error('Polling error:', err)
        // Continue polling unless it's a persistent error
        // After 3 consecutive errors, stop polling
        if (err.status === 404) {
          console.log('Session not found, stopping polling')
          stopPolling()
          error.value = 'Session not found'
        }
      }
    }, 5000) // Poll every 5 seconds

    // Clear polling after 10 minutes to prevent infinite polling
    setTimeout(() => {
      if (pollingInterval) {
        console.log('Polling timeout reached, stopping')
        stopPolling()
        if (isLoading.value) {
          error.value = 'Analysis timeout - please try again'
          isLoading.value = false
        }
      }
    }, 600000) // 10 minutes
  }

  const handleWebSocketOpen = () => {
    console.log('WebSocket connection established')
    isConnected.value = true
    error.value = null
  }

  const handleWebSocketClose = () => {
    console.log('WebSocket connection closed')
    isConnected.value = false
  }

  const startFactCheck = async (userInput, uploadedFile = null, mode = 'fact_check', style = 'professional') => {
    try {
      resetState()
      currentMode.value = mode // Set the current mode
      isLoading.value = true
      error.value = null
      originalClaim.value = userInput
      progress.currentStep = getLoadingStates().submitting
      
      // Set expected steps based on mode
      progress.expectedSteps = mode === 'research' ? 4 : 4 // Both modes have 4 steps

      // Create fact-check session
      const response = await factCheckService.createSession(userInput, uploadedFile, mode, style)
      sessionId.value = response.session_id
      
      // Cache the session data
      cacheSessionData(response.session_id, { userInput, uploadedFile: uploadedFile?.name, mode })

      // Save session to persistence service
      sessionPersistenceService.saveActiveSession({
        sessionId: response.session_id,
        originalClaim: userInput,
        mode: mode,
        startTime: new Date().toISOString(),
        uploadedFileName: uploadedFile?.name,
        progress: {
          percentage: 0,
          currentStep: getLoadingStates().submitting
        },
        status: 'in_progress'
      })

      // Use polling as the default primary method
      console.log(`Starting ${mode} with polling as primary method`)
      usePolling.value = true
      startStatusPolling()

      return response
    } catch (err) {
      console.error('Error starting fact-check:', err)
      isLoading.value = false
      
      // Enhanced error handling
      if (err.type === 'network_error') {
        error.value = 'Unable to connect to the server. Please check your internet connection.'
      } else if (err.status === 429) {
        error.value = 'Too many requests. Please wait a moment and try again.'
      } else if (err.status === 413) {
        error.value = 'File too large. Please upload a smaller image.'
      } else {
        error.value = err.message || 'Failed to start fact-check'
      }
      
      throw err
    }
  }

  // Cache session data for potential retry
  const cacheSessionData = (sessionId, data) => {
    try {
      const cacheData = {
        ...data,
        timestamp: Date.now()
      }
      localStorage.setItem(`fact_check_session_${sessionId}`, JSON.stringify(cacheData))
    } catch (e) {
      console.warn('Failed to cache session data:', e)
    }
  }

  // Get cached session data
  const getCachedSessionData = (sessionId) => {
    try {
      const cached = localStorage.getItem(`fact_check_session_${sessionId}`)
      if (cached) {
        const data = JSON.parse(cached)
        // Only return if cached within last hour
        if (Date.now() - data.timestamp < 3600000) {
          return data
        }
      }
    } catch (e) {
      console.warn('Failed to get cached session data:', e)
    }
    return null
  }

  const getSessionStatus = async () => {
    if (!sessionId.value) return null
    
    try {
      const status = await factCheckService.getStatus(sessionId.value)
      updateProgress(status)
      return status
    } catch (err) {
      console.error('Error getting session status:', err)
      return null
    }
  }

  const getSessionResults = async () => {
    if (!sessionId.value) return null
    
    try {
      const sessionResults = await factCheckService.getResults(sessionId.value)
      results.value = sessionResults
      return sessionResults
    } catch (err) {
      console.error('Error getting session results:', err)
      return null
    }
  }

  const recoverSession = async (sessionData) => {
    try {
      console.log('🔄 Recovering session with data:', {
        sessionId: sessionData.sessionId,
        originalClaim: sessionData.originalClaim,
        mode: sessionData.mode
      })
      
      // Preserve the original claim BEFORE resetState clears it
      const preservedClaim = sessionData.originalClaim || ''
      
      resetState()
      
      // Set session data - restore the preserved claim
      sessionId.value = sessionData.sessionId
      originalClaim.value = preservedClaim
      currentMode.value = sessionData.mode || 'fact_check'
      isLoading.value = true
      
      console.log('🔄 After setting originalClaim:', originalClaim.value)
      console.log('🔄 Preserved claim:', preservedClaim)
      console.log('🔄 Original claim is truthy:', !!originalClaim.value)
      
      // Get current status
      const status = await factCheckService.getStatus(sessionData.sessionId)
      
      if (status.status === 'completed') {
        // Get final results
        const fullResults = await factCheckService.getResults(sessionData.sessionId)
        results.value = fullResults
        
        // Ensure originalClaim is preserved - try multiple sources
        if (!originalClaim.value) {
          if (fullResults.original_claim) {
            console.log('📝 Setting originalClaim from results during recovery:', fullResults.original_claim)
            originalClaim.value = fullResults.original_claim
          } else if (preservedClaim) {
            console.log('📝 Restoring originalClaim from preserved value:', preservedClaim)
            originalClaim.value = preservedClaim
          }
        }
        
        console.log('🔄 Final originalClaim after recovery:', originalClaim.value)
        
        isLoading.value = false
        progress.percentage = 100
        progress.currentStep = 'Analysis complete'
        
        // Remove from active sessions
        sessionPersistenceService.removeActiveSession(sessionData.sessionId)
      } else if (status.status === 'cancelled') {
        // Session was cancelled
        isLoading.value = false
        error.value = null // Don't show cancellation as an error
        progress.currentStep = 'Analysis cancelled'
        
        // Remove cancelled session
        sessionPersistenceService.removeActiveSession(sessionData.sessionId)
      } else if (status.status === 'failed') {
        isLoading.value = false
        error.value = 'Analysis failed'
        
        // Remove failed session
        sessionPersistenceService.removeActiveSession(sessionData.sessionId)
      } else {
        // Session is still in progress, continue monitoring
        updateProgress(status)
        usePolling.value = true
        startStatusPolling()
      }
      
      return { success: true, status: status.status }
    } catch (err) {
      console.error('Failed to recover session:', err)
      resetState()
      throw err
    }
  }

  const cancelFactCheck = async () => {
    // Call backend cancel endpoint if we have an active session
    if (sessionId.value) {
      try {
        console.log('Cancelling session:', sessionId.value)
        await factCheckService.cancelSession(sessionId.value)
        console.log('Session cancelled successfully')
      } catch (err) {
        console.error('Failed to cancel session on backend:', err)
        // Continue with frontend cleanup even if backend call fails
      }
    }

    // Cleanup frontend state
    websocketService.disconnect()
    stopPolling()
    isConnected.value = false
    isLoading.value = false
    usePolling.value = false
    
    if (sessionId.value) {
      // Remove from active sessions
      sessionPersistenceService.removeActiveSession(sessionId.value)
      
      // Clear cached data
      try {
        localStorage.removeItem(`fact_check_session_${sessionId.value}`)
      } catch (e) {
        console.warn('Failed to clear cached session data:', e)
      }
    }
    
    resetState()
  }

  return {
    // State
    isLoading,
    sessionId,
    error,
    results,
    originalClaim,
    progress,
    isConnected,
    usePolling,
    currentMode,
    
    // Methods
    startFactCheck,
    getSessionStatus,
    getSessionResults,
    recoverSession,
    cancelFactCheck,
    resetState,
    getCachedSessionData,
    
    // Advanced features
    getLoadingStates
  }
}
