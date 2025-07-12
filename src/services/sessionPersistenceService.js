import factCheckService from './factCheckService'
import { notification } from 'ant-design-vue'

class SessionPersistenceService {
  constructor() {
    this.STORAGE_KEY = 'fact_check_active_sessions'
    this.NOTIFICATION_PERMISSION_KEY = 'fact_check_notification_permission'
    this.backgroundMonitor = null
    this.notificationPermission = this.getStoredNotificationPermission()
  }

  // Session persistence methods
  saveActiveSession(sessionData) {
    try {
      const activeSessions = this.getActiveSessions()
      const existingIndex = activeSessions.findIndex(session => session.sessionId === sessionData.sessionId)
      
      const sessionInfo = {
        sessionId: sessionData.sessionId,
        originalClaim: sessionData.originalClaim,
        mode: sessionData.mode || 'fact_check',
        startTime: sessionData.startTime || new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
        progress: sessionData.progress || { percentage: 0 },
        uploadedFileName: sessionData.uploadedFileName,
        status: sessionData.status || 'in_progress'
      }

      if (existingIndex >= 0) {
        activeSessions[existingIndex] = sessionInfo
      } else {
        activeSessions.push(sessionInfo)
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(activeSessions))
      console.log('Session saved:', sessionInfo)
    } catch (error) {
      console.error('Failed to save active session:', error)
    }
  }

  getActiveSessions() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored).filter(session => {
          // Remove sessions older than 24 hours
          const sessionTime = new Date(session.startTime)
          const now = new Date()
          return (now - sessionTime) < 24 * 60 * 60 * 1000
        })
      }
    } catch (error) {
      console.error('Failed to get active sessions:', error)
    }
    return []
  }

  removeActiveSession(sessionId) {
    try {
      const activeSessions = this.getActiveSessions()
      const filtered = activeSessions.filter(session => session.sessionId !== sessionId)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered))
      console.log('Session removed:', sessionId)
    } catch (error) {
      console.error('Failed to remove active session:', error)
    }
  }

  updateSessionProgress(sessionId, progressData) {
    try {
      const activeSessions = this.getActiveSessions()
      const sessionIndex = activeSessions.findIndex(session => session.sessionId === sessionId)
      
      if (sessionIndex >= 0) {
        activeSessions[sessionIndex].progress = progressData
        activeSessions[sessionIndex].lastUpdate = new Date().toISOString()
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(activeSessions))
      }
    } catch (error) {
      console.error('Failed to update session progress:', error)
    }
  }

  // Notification permission management
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications')
      return false
    }

    if (Notification.permission === 'granted') {
      this.notificationPermission = true
      this.storeNotificationPermission(true)
      return true
    }

    if (Notification.permission === 'denied') {
      this.notificationPermission = false
      this.storeNotificationPermission(false)
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      const granted = permission === 'granted'
      this.notificationPermission = granted
      this.storeNotificationPermission(granted)
      return granted
    } catch (error) {
      console.error('Failed to request notification permission:', error)
      return false
    }
  }

  getStoredNotificationPermission() {
    try {
      const stored = localStorage.getItem(this.NOTIFICATION_PERMISSION_KEY)
      return stored ? JSON.parse(stored) : false
    } catch (error) {
      return false
    }
  }

  storeNotificationPermission(granted) {
    try {
      localStorage.setItem(this.NOTIFICATION_PERMISSION_KEY, JSON.stringify(granted))
    } catch (error) {
      console.error('Failed to store notification permission:', error)
    }
  }

  // Send browser notification
  sendNotification(title, body, icon = '/favicon.ico', data = {}) {
    if (!this.notificationPermission || !('Notification' in window)) {
      console.log('Notifications not available or not permitted')
      return null
    }

    try {
      const notification = new Notification(title, {
        body,
        icon,
        badge: icon,
        tag: `fact-check-${data.sessionId}`, // Prevent duplicate notifications
        requireInteraction: true, // Keep notification until user interacts
        data
      })

      // Handle notification click
      notification.onclick = () => {
        window.focus()
        if (data.sessionId) {
          // Store session to restore when user returns
          this.markSessionForRestore(data.sessionId)
        }
        notification.close()
      }

      return notification
    } catch (error) {
      console.error('Failed to send notification:', error)
      return null
    }
  }

  markSessionForRestore(sessionId) {
    try {
      localStorage.setItem('fact_check_restore_session', sessionId)
    } catch (error) {
      console.error('Failed to mark session for restore:', error)
    }
  }

  getSessionToRestore() {
    try {
      const sessionId = localStorage.getItem('fact_check_restore_session')
      if (sessionId) {
        localStorage.removeItem('fact_check_restore_session')
        return sessionId
      }
    } catch (error) {
      console.error('Failed to get session to restore:', error)
    }
    return null
  }

  // Background monitoring for completed sessions
  startBackgroundMonitoring() {
    if (this.backgroundMonitor) {
      return // Already monitoring
    }

    this.backgroundMonitor = setInterval(async () => {
      const activeSessions = this.getActiveSessions()
      
      for (const session of activeSessions) {
        try {
          const status = await factCheckService.getStatus(session.sessionId)
          
          if (status.status === 'completed') {
            this.handleSessionComplete(session)
          } else if (status.status === 'failed') {
            this.handleSessionFailed(session)
          } else {
            // Update progress
            this.updateSessionProgress(session.sessionId, {
              percentage: status.progress_percentage || session.progress.percentage,
              currentStep: status.current_step?.description || session.progress.currentStep
            })
          }
        } catch (error) {
          console.error(`Failed to check status for session ${session.sessionId}:`, error)
          // If session not found (404), remove it
          if (error.status === 404) {
            this.removeActiveSession(session.sessionId)
          }
        }
      }

      // Stop monitoring if no active sessions
      if (activeSessions.length === 0) {
        this.stopBackgroundMonitoring()
      }
    }, 10000) // Check every 10 seconds

    console.log('Background monitoring started')
  }

  stopBackgroundMonitoring() {
    if (this.backgroundMonitor) {
      clearInterval(this.backgroundMonitor)
      this.backgroundMonitor = null
      console.log('Background monitoring stopped')
    }
  }

  async handleSessionComplete(session) {
    try {
      // Fetch results
      const results = await factCheckService.getResults(session.sessionId)
      
      // Send notification
      const title = session.mode === 'research' ? 'Research Complete!' : 'Fact-Check Complete!'
      const body = `Your ${session.mode === 'research' ? 'research' : 'analysis'} of "${this.truncateText(session.originalClaim, 50)}" is ready.`
      
      this.sendNotification(title, body, '/favicon.ico', {
        sessionId: session.sessionId,
        results,
        mode: session.mode
      })

      // Show in-app notification if page is visible
      if (document.visibilityState === 'visible') {
        notification.success({
          message: title,
          description: body,
          duration: 8,
          onClick: () => {
            // Could emit an event to restore the session
            this.markSessionForRestore(session.sessionId)
          }
        })
      }

      // Remove from active sessions
      this.removeActiveSession(session.sessionId)
      
      console.log('Session completed:', session.sessionId)
    } catch (error) {
      console.error('Failed to handle session completion:', error)
    }
  }

  async handleSessionFailed(session) {
    // Send failure notification
    const title = session.mode === 'research' ? 'Research Failed' : 'Fact-Check Failed'
    const body = `Your ${session.mode === 'research' ? 'research' : 'analysis'} could not be completed. Please try again.`
    
    this.sendNotification(title, body, '/favicon.ico', {
      sessionId: session.sessionId,
      mode: session.mode,
      failed: true
    })

    // Show in-app notification if page is visible
    if (document.visibilityState === 'visible') {
      notification.error({
        message: title,
        description: body,
        duration: 8
      })
    }

    // Remove from active sessions
    this.removeActiveSession(session.sessionId)
    
    console.log('Session failed:', session.sessionId)
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  // Recovery methods
  getSessionsForRecovery() {
    const activeSessions = this.getActiveSessions()
    return activeSessions.filter(session => {
      // Only show sessions that are recent (within last 2 hours)
      const sessionTime = new Date(session.lastUpdate)
      const now = new Date()
      return (now - sessionTime) < 2 * 60 * 60 * 1000
    })
  }

  async recoverSession(sessionId) {
    try {
      const status = await factCheckService.getStatus(sessionId)
      return {
        sessionId,
        status: status.status,
        progress: {
          percentage: status.progress_percentage || 0,
          currentStep: status.current_step?.description || '',
          steps: status.steps || []
        },
        isCompleted: status.status === 'completed',
        isFailed: status.status === 'failed'
      }
    } catch (error) {
      console.error('Failed to recover session:', error)
      // Remove invalid session
      this.removeActiveSession(sessionId)
      throw error
    }
  }

  // Page visibility handling
  setupVisibilityHandling() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // Page is hidden, start background monitoring if there are active sessions
        const activeSessions = this.getActiveSessions()
        if (activeSessions.length > 0) {
          this.startBackgroundMonitoring()
        }
      } else {
        // Page is visible, can rely on normal WebSocket/polling
        this.stopBackgroundMonitoring()
      }
    })

    // Handle page beforeunload
    window.addEventListener('beforeunload', () => {
      const activeSessions = this.getActiveSessions()
      if (activeSessions.length > 0) {
        this.startBackgroundMonitoring()
      }
    })
  }

  // Initialize the service
  initialize() {
    this.setupVisibilityHandling()
    
    // Check for any existing active sessions on startup
    const activeSessions = this.getActiveSessions()
    if (activeSessions.length > 0) {
      console.log(`Found ${activeSessions.length} active sessions on startup`)
      // Start monitoring immediately if page is hidden
      if (document.visibilityState === 'hidden') {
        this.startBackgroundMonitoring()
      }
    }

    // Check if user returned from notification click
    const sessionToRestore = this.getSessionToRestore()
    if (sessionToRestore) {
      console.log('Session marked for restore:', sessionToRestore)
      return sessionToRestore
    }

    return null
  }
}

export default new SessionPersistenceService()
