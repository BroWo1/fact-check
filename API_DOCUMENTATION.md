# Fact-Check API Documentation

## Overview

This document provides comprehensive API documentation for the Fact-Check backend integration. The API supports both fact-checking and research modes with real-time progress updates via WebSocket connections.

**Base URL:** `/api` (configurable via `VITE_API_URL`)  
**WebSocket URL:** `ws://localhost:8000/ws` (configurable via `VITE_WS_URL`)

## Authentication

Currently, no authentication is required for API endpoints.

## Error Handling

The API uses standard HTTP status codes and returns structured error responses:

```json
{
  "type": "api_error|network_error|unknown_error",
  "status": 500,
  "message": "Human-readable error message",
  "details": "Additional error details"
}
```

## Rate Limiting

- **429 Too Many Requests**: Implement backoff strategy
- Built-in retry logic with exponential backoff for temporary failures (502, 503, 504)
- Maximum 3 retry attempts for network errors

---

## Core Endpoints

### 1. Create Analysis Session

Creates a new fact-checking or research session.

**Endpoint:** `POST /fact-check/`  
**Content-Type:** `multipart/form-data`

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_input` | string | Yes | Text to analyze or research query |
| `mode` | string | Yes | `"fact_check"` or `"research"` |
| `style` | string | No | Analysis style: `"professional"`, `"concise"`, or `"informational"` (research mode only) |
| `uploaded_image` | file | No | Image file for analysis (JPEG, PNG, etc.) |

#### Response

```json
{
  "session_id": "uuid-string",
  "status": "created",
  "mode": "fact_check",
  "user_input": "Claim to be fact-checked",
  "created_at": "2024-01-01T12:00:00Z"
}
```

#### Example

```javascript
const formData = new FormData()
formData.append('user_input', 'Vaccines contain microchips')
formData.append('mode', 'fact_check')
formData.append('uploaded_image', imageFile) // optional

const response = await fetch('/api/fact-check/', {
  method: 'POST',
  body: formData
})
```

---

### 2. Get Session Status

Retrieves current processing status of a session.

**Endpoint:** `GET /fact-check/{sessionId}/status/`

#### Response

```json
{
  "session_id": "uuid-string",
  "status": "processing|completed|failed",
  "progress": {
    "percentage": 75,
    "current_step": "source_credibility_evaluation", 
    "steps": [
      {
        "step_type": "initial_web_search",
        "status": "completed",
        "summary": "Found 15 relevant sources",
        "description": "Detailed step description",
        "started_at": "2024-01-01T12:00:00Z",
        "completed_at": "2024-01-01T12:01:00Z"
      }
    ],
    "estimated_completion": "2024-01-01T12:05:00Z",
    "processing_time": 120.5
  }
}
```

#### Status Values

- `"created"` - Session created, not yet started
- `"processing"` - Analysis in progress
- `"completed"` - Analysis finished successfully  
- `"failed"` - Analysis failed with error
- `"cancelled"` - Analysis was cancelled

---

### 3. Get Analysis Results

Retrieves the final analysis results.

**Endpoint:** `GET /fact-check/{sessionId}/results/`

#### Fact-Check Response

```json
{
  "session_id": "uuid-string",
  "mode": "fact_check",
  "verdict": "likely_false",
  "confidence": 85,
  "claim": "Original claim text",
  "analysis": "Detailed analysis text",
  "key_findings": [
    "Finding 1",
    "Finding 2"
  ],
  "supporting_evidence": [
    {
      "source": "Source name",
      "url": "https://example.com",
      "excerpt": "Relevant text excerpt",
      "credibility_score": 90
    }
  ],
  "contradictory_evidence": [
    {
      "source": "Source name", 
      "url": "https://example.com",
      "excerpt": "Contradictory excerpt",
      "credibility_score": 85
    }
  ],
  "citations": [
    {
      "id": 1,
      "title": "Source title",
      "url": "https://example.com",
      "domain": "example.com",
      "credibility_score": 90
    }
  ],
  "completed_at": "2024-01-01T12:05:00Z",
  "processing_time": 300.2
}
```

#### Research Response  

```json
{
  "session_id": "uuid-string",
  "mode": "research", 
  "topic": "Research query",
  "report": {
    "sections": [
      {
        "id": "introduction",
        "title": "Introduction",
        "content": "Section content in markdown",
        "sources": [1, 2, 3]
      }
    ]
  },
  "sources": [
    {
      "id": 1,
      "title": "Source title",
      "url": "https://example.com", 
      "domain": "example.com",
      "credibility_score": 90,
      "relevance_score": 85
    }
  ],
  "limitations": "Research limitations text",
  "recommendations": "Recommendations text", 
  "completed_at": "2024-01-01T12:08:00Z",
  "processing_time": 480.7
}
```

#### Verdict Values (Fact-Check)

- `"true"` - Claim is true
- `"likely_true"` - Claim is likely true
- `"uncertain"` - Insufficient evidence
- `"likely_false"` - Claim is likely false  
- `"false"` - Claim is false
- `"suspicious"` - Claim appears suspicious

---

### 4. Get Processing Steps

Retrieves detailed information about processing steps.

**Endpoint:** `GET /fact-check/{sessionId}/steps/`

#### Response

```json
{
  "session_id": "uuid-string",
  "steps": [
    {
      "step_type": "initial_web_search",
      "status": "completed",
      "summary": "Brief step summary", 
      "description": "Detailed step description",
      "sources_found": 15,
      "started_at": "2024-01-01T12:00:00Z",
      "completed_at": "2024-01-01T12:01:00Z",
      "duration": 60.2
    }
  ],
  "total_steps": 4,
  "completed_steps": 2
}
```

#### Step Types (Fact-Check)

- `"initial_web_search"` - Initial source discovery
- `"deeper_exploration"` - Detailed source analysis  
- `"source_credibility_evaluation"` - Source credibility assessment
- `"final_conclusion"` - Final verdict generation

#### Step Types (Research)

- `"research_understanding"` - Query analysis
- `"general_research"` - Broad topic research
- `"specific_research"` - Focused research

---

### 5. List Sessions

Retrieves a paginated list of user sessions.

**Endpoint:** `GET /fact-check/list/`

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page_size` | integer | 20 | Number of sessions per page (max: 100) |
| `offset` | integer | 0 | Number of sessions to skip |

#### Response

```json
{
  "sessions": [
    {
      "session_id": "uuid-string",
      "mode": "fact_check",
      "user_input": "Claim text",
      "status": "completed",
      "verdict": "likely_false", 
      "confidence": 85,
      "created_at": "2024-01-01T12:00:00Z",
      "completed_at": "2024-01-01T12:05:00Z"
    }
  ],
  "total": 150,
  "page_size": 20,
  "offset": 0,
  "has_more": true
}
```

---

### 6. Delete Session

Deletes a session and all associated data.

**Endpoint:** `DELETE /fact-check/{sessionId}/delete/`

#### Response

```json
{
  "message": "Session deleted successfully",
  "session_id": "uuid-string"
}
```

---

### 7. Cancel Session

Cancels an active processing session.

**Endpoint:** `POST /fact-check/{sessionId}/cancel/`

#### Response

```json
{
  "message": "Session cancelled successfully",
  "session_id": "uuid-string",
  "status": "cancelled"
}
```

---

### 8. Edit Section (Research Mode)

Edits a specific section of a research report using AI.

**Endpoint:** `POST /fact-check/{sessionId}/edit-section/`  
**Content-Type:** `application/json`  
**Timeout:** 180 seconds

#### Request Body

```json
{
  "section_id": "introduction",
  "section_title": "Introduction", 
  "original_content": "Original section markdown content",
  "edit_prompt": "Make this section more detailed and add statistics",
  "full_report": "Complete report markdown (optional)"
}
```

#### Synchronous Response (200)

```json
{
  "status": "completed",
  "updated_section": {
    "id": "introduction",
    "title": "Introduction",
    "content": "Updated markdown content",
    "sources": [1, 2, 3]
  },
  "processing_time": 45.2
}
```

#### Asynchronous Response (202)

```json
{
  "status": "processing",
  "edit_id": "edit-uuid",
  "polling_url": "/fact-check/edits/edit-uuid/status/",
  "estimated_completion": "2024-01-01T12:03:00Z"
}
```

#### Polling Edit Status

**Endpoint:** `GET /fact-check/edits/{editId}/status/`

```json
{
  "edit_id": "edit-uuid",
  "status": "processing|completed|failed",
  "progress": 75,
  "estimated_completion": "2024-01-01T12:03:00Z",
  "updated_section": {}, // Only present when completed
  "error_message": "Error details", // Only present when failed
  "processing_time": 120.5
}
```

---

### 9. Quick Ask AI

Ask a question about a completed analysis report.

**Endpoint:** `POST /fact-check/{sessionId}/quick-ask/`  
**Content-Type:** `application/json`  
**Timeout:** 60 seconds

#### Request Body

```json
{
  "question": "What are the main sources used in this analysis?",
  "report_content": "Full report content for context"
}
```

#### Synchronous Response (200)

```json
{
  "question": "What are the main sources used in this analysis?",
  "answer": "The main sources used in this analysis include...",
  "response_time": 12.3,
  "session_id": "uuid-string"
}
```

#### Asynchronous Response (202)

```json
{
  "status": "processing",
  "ask_id": "ask-uuid",
  "polling_url": "/fact-check/asks/ask-uuid/status/",
  "estimated_completion": "2024-01-01T12:01:00Z"
}
```

#### Polling Ask Status

**Endpoint:** `GET /fact-check/asks/{askId}/status/`

```json
{
  "ask_id": "ask-uuid",
  "status": "processing|completed|failed",
  "progress": 75,
  "estimated_completion": "2024-01-01T12:01:00Z",
  "question": "What are the main sources used in this analysis?",
  "answer": "The main sources used in this analysis include...", // Only present when completed
  "error_message": "Error details", // Only present when failed
  "response_time": 15.7
}
```

---

### 10. Health Check

Checks API service health.

**Endpoint:** `GET /health/`

#### Response

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "version": "1.0.0",
  "services": {
    "database": "healthy",
    "external_apis": "healthy"
  }
}
```

---

## WebSocket Integration

### Connection

**URL:** `ws://localhost:8000/ws/fact-check/{sessionId}/`

### Connection Management

- **Automatic Reconnection:** Up to 5 attempts with exponential backoff
- **Heartbeat:** Send ping messages to maintain connection
- **Graceful Disconnection:** Close with code 1000

### Message Types

#### Client to Server

```json
{
  "type": "get_status"
}
```

```json
{
  "type": "ping"
}
```

#### Server to Client

##### Progress Update

```json
{
  "type": "progress_update",
  "session_id": "uuid-string",
  "progress": {
    "percentage": 45,
    "current_step": "deeper_exploration",
    "step_status": "in_progress", 
    "estimated_completion": "2024-01-01T12:03:00Z"
  }
}
```

##### Step Completion

```json
{
  "type": "step_completed",
  "session_id": "uuid-string", 
  "step": {
    "step_type": "initial_web_search",
    "status": "completed",
    "summary": "Found 12 relevant sources",
    "duration": 30.5
  }
}
```

##### Analysis Complete

```json
{
  "type": "analysis_complete",
  "session_id": "uuid-string",
  "results": {
    "verdict": "likely_false",
    "confidence": 85
  }
}
```

##### Error

```json
{
  "type": "error",
  "session_id": "uuid-string",
  "error": {
    "code": "PROCESSING_ERROR",
    "message": "Failed to process analysis"
  }
}
```

##### Pong (Heartbeat Response)

```json
{
  "type": "pong",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### WebSocket Error Handling

| Error Type | Description | Action |
|------------|-------------|---------|
| `connection_error` | Failed to establish connection | Fallback to polling |
| `websocket_error` | WebSocket connection failed | Attempt reconnection |
| `parse_error` | Invalid JSON received | Log error, continue |
| `max_reconnect_attempts` | All reconnection attempts failed | Switch to polling mode |

### Connection States

- `CONNECTING` - Establishing connection
- `CONNECTED` - Connection active  
- `CLOSING` - Connection closing
- `DISCONNECTED` - No connection

---

## Client Implementation Examples

### Creating a Session with File Upload

```javascript
import factCheckService from './services/factCheckService'

const analyzeContent = async (text, imageFile, mode = 'fact_check') => {
  try {
    const session = await factCheckService.createSession(
      text, 
      imageFile, 
      mode,
      'professional' // style for research mode
    )
    
    console.log('Session created:', session.session_id)
    return session
  } catch (error) {
    console.error('Failed to create session:', error.message)
    throw error
  }
}
```

### Polling for Results

```javascript
const pollForResults = async (sessionId) => {
  const maxAttempts = 60 // 5 minutes at 5-second intervals
  let attempts = 0
  
  while (attempts < maxAttempts) {
    try {
      const status = await factCheckService.getStatus(sessionId)
      
      if (status.status === 'completed') {
        const results = await factCheckService.getResults(sessionId)
        return results
      } else if (status.status === 'failed') {
        throw new Error('Analysis failed')
      }
      
      // Wait 5 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 5000))
      attempts++
      
    } catch (error) {
      console.error('Polling error:', error)
      attempts++
    }
  }
  
  throw new Error('Analysis timeout')
}
```

### WebSocket Integration

```javascript
import websocketService from './services/websocketService'

const connectToSession = (sessionId) => {
  websocketService.connect(
    sessionId,
    (message) => {
      // Handle progress updates
      if (message.type === 'progress_update') {
        updateProgressUI(message.progress)
      } else if (message.type === 'analysis_complete') {
        handleAnalysisComplete(message.results)
      }
    },
    (error) => {
      console.error('WebSocket error:', error)
      // Fallback to polling
      startPolling(sessionId)
    }
  )
}
```

### Editing Research Sections

```javascript
const editSection = async (sessionId, sectionData) => {
  try {
    const result = await factCheckService.editSection(
      sessionId,
      {
        sectionId: 'introduction',
        sectionTitle: 'Introduction',
        originalContent: 'Original content...',
        editPrompt: 'Make this more detailed',
        fullReport: 'Complete report...'
      },
      (status, attempt, maxAttempts) => {
        // Status update callback
        console.log(`Edit status: ${status} (${attempt}/${maxAttempts})`)
      }
    )
    
    return result.updated_section
  } catch (error) {
    console.error('Edit failed:', error.message)
    throw error
  }
}
```

### Quick Ask AI with Polling

```javascript
const askQuestion = async (sessionId, question, reportContent) => {
  try {
    const result = await factCheckService.quickAsk(
      sessionId,
      {
        question: question,
        reportContent: reportContent
      },
      (status, attempt, maxAttempts) => {
        // Status update callback for polling
        console.log(`Ask status: ${status} (${attempt}/${maxAttempts})`)
        updateProgressUI(`Processing question... (${attempt}/${maxAttempts})`)
      }
    )
    
    return result.answer
  } catch (error) {
    console.error('Quick ask failed:', error.message)
    throw error
  }
}
```

---

## Error Codes Reference

### HTTP Status Codes

| Code | Description | Retry | Action |
|------|-------------|-------|---------|
| 200 | Success | No | Process response |
| 202 | Accepted (Async) | No | Start polling |
| 400 | Bad Request | No | Check request format |
| 404 | Not Found | No | Session may be expired |
| 429 | Too Many Requests | Yes | Implement backoff |
| 500 | Internal Server Error | No | Report error |
| 502 | Bad Gateway | Yes | Retry with backoff |
| 503 | Service Unavailable | Yes | Retry with backoff |
| 504 | Gateway Timeout | Yes | Retry with backoff |

### Custom Error Types

| Type | Description | Handling |
|------|-------------|----------|
| `api_error` | Server-side error | Display error message |
| `network_error` | Connection failed | Check network, retry |
| `unknown_error` | Unexpected error | Log for debugging |
| `timeout_error` | Request timeout | Retry or switch to polling |

---

## Performance Considerations

### Timeouts

- **Standard API calls:** 60 seconds
- **Edit section requests:** 180 seconds
- **Quick ask requests:** 60 seconds
- **WebSocket heartbeat:** 30 seconds
- **Edit polling interval:** 5 seconds (max 60 attempts = 5 minutes)
- **Quick ask polling interval:** 2 seconds (max 30 attempts = 1 minute)

### Rate Limiting

- Implement exponential backoff for 429 responses
- Maximum 3 retry attempts for failed requests
- Use WebSocket for real-time updates when possible

### Caching

- Cache session results locally
- Implement session persistence for recovery
- Store partial progress for better UX

### Fallback Strategy

1. **Primary:** WebSocket for real-time updates
2. **Fallback:** HTTP polling every 5 seconds  
3. **Error Recovery:** Retry with exponential backoff
4. **Session Recovery:** Restore from local storage

---

## Development & Testing

### Environment Variables

```bash
# API Configuration
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000/ws

# Production
VITE_API_URL=/api
VITE_WS_URL=wss://api.example.com/ws
```

### Testing Endpoints

Use the health check endpoint to verify API availability:

```bash
curl -X GET http://localhost:8000/api/health/
```

### Mock Data

The client includes a mock backend service for development and testing purposes.

---

This documentation covers all API endpoints and integration patterns used by the Fact-Check application. For additional support or questions, please refer to the codebase or contact the development team.