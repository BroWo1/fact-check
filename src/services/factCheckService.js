import axios from 'axios'
import { API_BASE_URL } from './config'

class FactCheckService {
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 60000, // Increased timeout for analysis requests
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error)
        return Promise.reject(error)
      }
    )

    this.maxRetries = 3
  }

  // Retry logic with exponential backoff
  async makeRequestWithRetry(requestFn, retries = 0) {
    try {
      return await requestFn()
    } catch (error) {
      if (retries < this.maxRetries && this.shouldRetry(error)) {
        const delay = Math.pow(2, retries) * 1000 // Exponential backoff
        console.log(`Request failed, retrying in ${delay}ms (attempt ${retries + 1}/${this.maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.makeRequestWithRetry(requestFn, retries + 1)
      }
      throw error
    }
  }

  shouldRetry(error) {
    // Retry on network errors or 5xx server errors
    return !error.response || 
           error.response.status >= 500 || 
           error.code === 'NETWORK_ERROR' ||
           error.code === 'ECONNRESET'
  }

  async createSession(userInput, uploadedImage = null, mode = 'fact_check', style = 'professional') {
    try {
      const formData = new FormData()
      formData.append('user_input', userInput)
      formData.append('mode', mode)
      if (style && mode === 'research') {
        formData.append('style', style)
      }
      if (uploadedImage) {
        formData.append('uploaded_image', uploadedImage)
      }

      const response = await this.axiosInstance.post('/fact-check/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async getStatus(sessionId) {
    return this.makeRequestWithRetry(async () => {
      const response = await this.axiosInstance.get(`/fact-check/${sessionId}/status/`)
      return response.data
    })
  }

  async getResults(sessionId) {
    return this.makeRequestWithRetry(async () => {
      const response = await this.axiosInstance.get(`/fact-check/${sessionId}/results/`)
      return response.data
    })
  }

  async getSteps(sessionId) {
    try {
      const response = await this.axiosInstance.get(`/fact-check/${sessionId}/steps/`)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async listSessions(pageSize = 20, offset = 0) {
    try {
      const response = await this.axiosInstance.get('/fact-check/list/', {
        params: { page_size: pageSize, offset }
      })
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async deleteSession(sessionId) {
    try {
      const response = await this.axiosInstance.delete(`/fact-check/${sessionId}/delete/`)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async cancelSession(sessionId) {
    try {
      const response = await this.axiosInstance.post(`/fact-check/${sessionId}/cancel/`)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async healthCheck() {
    try {
      const response = await this.axiosInstance.get('/health/')
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  handleError(error) {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response
      return {
        type: 'api_error',
        status,
        message: data.message || data.error || 'An error occurred',
        details: data
      }
    } else if (error.request) {
      // Network error
      return {
        type: 'network_error',
        message: 'Unable to connect to the server. Please check your internet connection.',
        details: error.message
      }
    } else {
      // Other error
      return {
        type: 'unknown_error',
        message: 'An unexpected error occurred',
        details: error.message
      }
    }
  }
}

export default new FactCheckService()
