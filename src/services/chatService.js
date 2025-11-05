import axios from 'axios'
import { API_BASE_URL } from './config'
import mockChatBackend from './mockChatBackend'

/**
 * Chat Service
 *
 * Handles communication with the chat API backend.
 * Currently uses mock backend for development.
 *
 * === API INTEGRATION GUIDE ===
 *
 * When the real backend is ready, update the following:
 *
 * 1. Set USE_MOCK to false (line 18)
 *
 * 2. Implement the following backend endpoints:
 *
 *    POST /api/chat/send
 *    Request body: {
 *      conversation_id: string,
 *      message: string,
 *      history: Array<{role: 'user'|'assistant', content: string, timestamp: string}>
 *    }
 *    Response: {
 *      message: string,
 *      timestamp: string
 *    }
 *
 *    Optional endpoints (for future enhancements):
 *
 *    GET /api/chat/conversations
 *    Response: Array<{
 *      id: string,
 *      title: string,
 *      createdAt: string,
 *      updatedAt: string,
 *      preview: string
 *    }>
 *
 *    GET /api/chat/conversations/:id
 *    Response: {
 *      id: string,
 *      title: string,
 *      messages: Array<{
 *        id: string,
 *        role: 'user'|'assistant',
 *        content: string,
 *        timestamp: string
 *      }>
 *    }
 *
 *    DELETE /api/chat/conversations/:id
 *    Response: { success: boolean }
 *
 * 3. Backend implementation notes:
 *    - Use streaming responses for real-time message display (Server-Sent Events or WebSocket)
 *    - Implement rate limiting to prevent abuse
 *    - Store conversation history on the backend for cross-device sync
 *    - Add authentication/authorization for user-specific conversations
 *    - Consider implementing conversation context limits (e.g., last 10 messages)
 *
 * 4. Error handling:
 *    - Network errors: Retry with exponential backoff
 *    - Rate limiting: Show user-friendly message with retry timer
 *    - Authentication errors: Redirect to login if applicable
 *    - Server errors: Show error message and allow retry
 */

// Toggle between mock and real API
const USE_MOCK = true // Set to false when real API is ready

class ChatService {
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('Chat API Error:', error)
        return Promise.reject(error)
      }
    )

    this.maxRetries = 3
  }

  /**
   * Send a message in a conversation
   *
   * @param {string} conversationId - The conversation ID
   * @param {string} message - The user's message
   * @param {Array} history - Previous messages in the conversation
   * @returns {Promise<Object>} - Response with AI message
   */
  async sendMessage(conversationId, message, history = []) {
    // Use mock backend if enabled
    if (USE_MOCK) {
      return mockChatBackend.sendMessage(conversationId, message, history)
    }

    // Real API implementation
    try {
      const response = await this.axiosInstance.post('/chat/send', {
        conversation_id: conversationId,
        message: message,
        history: history.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        }))
      })

      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * Get all conversations (optional - for backend sync)
   */
  async getConversations() {
    if (USE_MOCK) {
      // Return empty array - conversations are stored locally
      return []
    }

    try {
      const response = await this.axiosInstance.get('/chat/conversations')
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * Get a specific conversation (optional - for backend sync)
   */
  async getConversation(conversationId) {
    if (USE_MOCK) {
      // Return null - conversation is stored locally
      return null
    }

    try {
      const response = await this.axiosInstance.get(`/chat/conversations/${conversationId}`)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * Delete a conversation (optional - for backend sync)
   */
  async deleteConversation(conversationId) {
    if (USE_MOCK) {
      // No-op - conversation is deleted locally
      return { success: true }
    }

    try {
      const response = await this.axiosInstance.delete(`/chat/conversations/${conversationId}`)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * Handle API errors
   */
  handleError(error) {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status
      const message = error.response.data?.message || error.message

      switch (status) {
        case 400:
          return new Error(`Bad request: ${message}`)
        case 401:
          return new Error('Unauthorized. Please log in.')
        case 403:
          return new Error('Forbidden. You do not have access.')
        case 404:
          return new Error('Not found.')
        case 429:
          return new Error('Too many requests. Please try again later.')
        case 500:
          return new Error('Server error. Please try again.')
        default:
          return new Error(`Error: ${message}`)
      }
    } else if (error.request) {
      // Request made but no response
      return new Error('Network error. Please check your connection.')
    } else {
      // Something else happened
      return new Error(error.message || 'An unexpected error occurred.')
    }
  }
}

export default new ChatService()
