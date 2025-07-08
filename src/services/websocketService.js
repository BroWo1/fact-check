import { WS_BASE_URL } from './config'

class WebSocketService {
  constructor() {
    this.socket = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 2000
    this.messageHandlers = new Map()
    this.errorHandlers = new Map()
  }

  connect(sessionId, onMessage, onError = null, onOpen = null, onClose = null) {
    const url = `${WS_BASE_URL}/fact-check/${sessionId}/`
    
    console.log('Attempting WebSocket connection to:', url)
    
    try {
      this.socket = new WebSocket(url)

      this.socket.onopen = (event) => {
        console.log('WebSocket connected for session:', sessionId)
        this.reconnectAttempts = 0
        if (onOpen) onOpen(event)
      }

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('WebSocket message received:', data)
          onMessage(data)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
          if (onError) onError({ type: 'parse_error', error })
        }
      }

      this.socket.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason)
        if (onClose) onClose(event)
        
        // Only attempt reconnection for unexpected closures and if we're not at max attempts
        if (event.code !== 1000 && event.code !== 1001 && this.reconnectAttempts < this.maxReconnectAttempts) {
          console.log('Unexpected WebSocket closure, attempting reconnection...')
          this.attemptReconnect(sessionId, onMessage, onError, onOpen, onClose)
        }
      }

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error)
        if (onError) onError({ type: 'websocket_error', error, message: 'WebSocket connection failed' })
      }

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      if (onError) onError({ type: 'connection_error', error, message: 'Failed to establish WebSocket connection' })
    }
  }

  sendMessage(message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(message))
        return true
      } catch (error) {
        console.error('Error sending WebSocket message:', error)
        return false
      }
    } else {
      console.warn('WebSocket is not connected. Cannot send message:', message)
      return false
    }
  }

  getStatus() {
    return this.sendMessage({ type: 'get_status' })
  }

  ping() {
    return this.sendMessage({ type: 'ping' })
  }

  disconnect() {
    if (this.socket) {
      this.socket.close(1000, 'Client disconnect')
      this.socket = null
    }
    this.reconnectAttempts = 0
  }

  attemptReconnect(sessionId, onMessage, onError, onOpen, onClose) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = this.reconnectDelay * this.reconnectAttempts
      
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`)
      
      setTimeout(() => {
        this.connect(sessionId, onMessage, onError, onOpen, onClose)
      }, delay)
    } else {
      console.error('Max reconnection attempts reached')
      if (onError) {
        onError({ 
          type: 'max_reconnect_attempts',
          message: 'Failed to reconnect to the server'
        })
      }
    }
  }

  isConnected() {
    return this.socket && this.socket.readyState === WebSocket.OPEN
  }

  getConnectionState() {
    if (!this.socket) return 'DISCONNECTED'
    
    switch (this.socket.readyState) {
      case WebSocket.CONNECTING:
        return 'CONNECTING'
      case WebSocket.OPEN:
        return 'CONNECTED'
      case WebSocket.CLOSING:
        return 'CLOSING'
      case WebSocket.CLOSED:
        return 'DISCONNECTED'
      default:
        return 'UNKNOWN'
    }
  }
}

export default new WebSocketService()
