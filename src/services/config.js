// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// For WebSocket, bypass proxy in development and connect directly to backend
const WS_BASE_URL = import.meta.env.VITE_WS_URL || 
  (import.meta.env.DEV ? 'ws://localhost:8000/ws' : 'ws://localhost:8000/ws')

export { API_BASE_URL, WS_BASE_URL }
