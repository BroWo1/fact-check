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
    // Don't retry if no response (network errors) - these should be retried
    if (!error.response) {
      return error.code === 'NETWORK_ERROR' ||
             error.code === 'ECONNRESET' ||
             error.code === 'ECONNABORTED' || // axios timeout
             error.message?.includes('timeout')
    }

    // For server responses, only retry specific cases
    const status = error.response.status
    
    // Retry 502, 503, 504 (temporary server issues)
    if (status === 502 || status === 503 || status === 504) {
      return true
    }
    
    // Don't retry 500 Internal Server Error - usually indicates a code bug
    if (status === 500) {
      return false
    }
    
    // Don't retry 4xx client errors
    if (status >= 400 && status < 500) {
      return false
    }
    
    return false
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

  async editSection(sessionId, sectionData, onStatusUpdate = null) {
    return this.makeRequestWithRetry(async () => {
      console.log('Edit section request:', {
        sessionId,
        sectionTitle: sectionData.sectionTitle,
        editPromptLength: sectionData.editPrompt?.length,
        originalContentLength: sectionData.originalContent?.length,
        fullReportLength: sectionData.fullReport?.length
      })
      
      // Use longer timeout for edit requests as they can take more time to process
      const response = await this.axiosInstance.post(`/fact-check/${sessionId}/edit-section/`, {
        section_id: sectionData.sectionId,
        section_title: sectionData.sectionTitle,
        original_content: sectionData.originalContent,
        edit_prompt: sectionData.editPrompt,
        full_report: sectionData.fullReport
      }, {
        timeout: 180000 // 3 minutes timeout for edit requests
      })
      
      console.log('Edit section response:', response.status)
      
      // Handle async processing (202 response)
      if (response.status === 202 && response.data.status === 'processing') {
        console.log('Edit is processing, polling for result...')
        
        // Notify that we're starting to poll
        if (onStatusUpdate) {
          onStatusUpdate('polling', 0, 60)
        }
        
        return await this.pollEditResult(response.data.polling_url, response.data.edit_id, 60, onStatusUpdate)
      }
      
      // Handle synchronous response (200)
      return response.data
    })
  }

  async pollEditResult(pollingUrl, editId, maxAttempts = 60, onStatusUpdate = null) {
    let attempts = 0
    const pollInterval = 5000 // 2 seconds
    
    while (attempts < maxAttempts) {
      try {
        console.log(`Polling edit result (attempt ${attempts + 1}/${maxAttempts})`)
        
        // Fix the polling URL - remove /api prefix if it exists since axios will add it
        let cleanPollingUrl = pollingUrl
        if (pollingUrl.startsWith('/api/')) {
          cleanPollingUrl = pollingUrl.substring(4) // Remove '/api' prefix
        } else if (pollingUrl.includes('/api/')) {
          // Handle full URLs or URLs with domain
          const url = new URL(pollingUrl, window.location.origin)
          cleanPollingUrl = url.pathname.replace('/api', '')
        }
        
        console.log('Polling URL:', cleanPollingUrl)
        
        const response = await this.axiosInstance.get(cleanPollingUrl)
        const data = response.data
        
        console.log('Poll response:', data)
        
        // Notify about status updates
        if (onStatusUpdate) {
          onStatusUpdate(data.status, attempts + 1, maxAttempts)
        }
        
        if (data.status === 'completed') {
          console.log('Edit completed successfully')
          // Return the completed response with updated_section
          return {
            status: 'completed',
            updated_section: data.updated_section,
            processing_time: data.processing_time
          }
        } else if (data.status === 'failed') {
          throw new Error(data.error_message || data.error || 'Edit processing failed')
        } else if (data.status === 'processing' || data.status === 'pending') {
          // Continue polling
          attempts++
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, pollInterval))
          }
        } else {
          throw new Error(`Unknown edit status: ${data.status}`)
        }
      } catch (error) {
        if (error.response?.status === 404) {
          throw new Error('Edit session not found')
        }
        throw error
      }
    }
    
    throw new Error('Edit processing timeout - maximum polling attempts reached')
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
      
      let message = 'An error occurred'
      
      // Provide specific messages for common errors
      if (status === 500) {
        message = 'Server error occurred while processing your request'
      } else if (status === 502) {
        message = 'Server is temporarily unavailable'
      } else if (status === 503) {
        message = 'Service temporarily unavailable'
      } else if (status === 504) {
        message = 'Request timed out on the server'
      } else if (status === 429) {
        message = 'Too many requests. Please wait a moment before trying again'
      } else if (data?.message || data?.error) {
        message = data.message || data.error
      }
      
      return {
        type: 'api_error',
        status,
        message,
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
