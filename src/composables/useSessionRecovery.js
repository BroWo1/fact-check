import { ref, computed } from 'vue'
import { notification } from 'ant-design-vue'
import sessionPersistenceService from '../services/sessionPersistenceService'

export function useSessionRecovery() {
  const availableSessions = ref([])
  const isRecovering = ref(false)
  const showRecoveryDialog = ref(false)

  // Computed properties
  const hasRecoverableSessions = computed(() => availableSessions.value.length > 0)

  // Load recoverable sessions
  const loadRecoverableSessions = () => {
    const sessions = sessionPersistenceService.getSessionsForRecovery()
    availableSessions.value = sessions
    showRecoveryDialog.value = sessions.length > 0
    return sessions
  }

  // Format session for display
  const formatSessionForDisplay = (session) => {
    const timeAgo = getTimeAgo(new Date(session.lastUpdate))
    const shortClaim = session.originalClaim.length > 60 
      ? `${session.originalClaim.substring(0, 60)}...` 
      : session.originalClaim
    
    return {
      ...session,
      displayClaim: shortClaim,
      timeAgo,
      modeLabel: session.mode === 'research' ? 'Research' : 'Fact-Check',
      progressText: `${Math.round(session.progress?.percentage || 0)}%`
    }
  }

  // Get time ago string
  const getTimeAgo = (date) => {
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)

    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    } else {
      return 'Just now'
    }
  }

  // Recover a specific session
  const recoverSession = async (sessionId) => {
    isRecovering.value = true
    try {
      const recoveredSession = await sessionPersistenceService.recoverSession(sessionId)
      
      notification.success({
        message: 'Session Recovered',
        description: 'Your analysis session has been restored and will continue.',
        duration: 4
      })

      return recoveredSession
    } catch (error) {
      console.error('Failed to recover session:', error)
      
      notification.error({
        message: 'Recovery Failed',
        description: 'Could not recover the session. It may have expired.',
        duration: 4
      })
      
      // Remove from available sessions
      availableSessions.value = availableSessions.value.filter(s => s.sessionId !== sessionId)
      
      throw error
    } finally {
      isRecovering.value = false
    }
  }

  // Dismiss a session (don't recover)
  const dismissSession = (sessionId) => {
    sessionPersistenceService.removeActiveSession(sessionId)
    availableSessions.value = availableSessions.value.filter(s => s.sessionId !== sessionId)
    
    if (availableSessions.value.length === 0) {
      showRecoveryDialog.value = false
    }
  }

  // Dismiss all sessions
  const dismissAllSessions = () => {
    availableSessions.value.forEach(session => {
      sessionPersistenceService.removeActiveSession(session.sessionId)
    })
    availableSessions.value = []
    showRecoveryDialog.value = false
  }

  // Close recovery dialog
  const closeRecoveryDialog = () => {
    showRecoveryDialog.value = false
  }

  // Check for sessions to recover on app startup
  const checkForRecoverableSessions = () => {
    const sessions = loadRecoverableSessions()
    
    if (sessions.length > 0) {
      console.log(`Found ${sessions.length} recoverable sessions`)
      
      // Also check if user returned from notification
      const sessionToRestore = sessionPersistenceService.getSessionToRestore()
      if (sessionToRestore) {
        const targetSession = sessions.find(s => s.sessionId === sessionToRestore)
        if (targetSession) {
          // Auto-recover the session user clicked on
          setTimeout(() => {
            recoverSession(sessionToRestore)
              .then(recoveredSession => {
                // Emit event or return session for parent component
                return recoveredSession
              })
              .catch(error => {
                console.error('Auto-recovery failed:', error)
              })
          }, 1000)
        }
      }
    }

    return sessions
  }

  return {
    // State
    availableSessions,
    isRecovering,
    showRecoveryDialog,
    hasRecoverableSessions,

    // Methods
    loadRecoverableSessions,
    formatSessionForDisplay,
    recoverSession,
    dismissSession,
    dismissAllSessions,
    closeRecoveryDialog,
    checkForRecoverableSessions
  }
}
