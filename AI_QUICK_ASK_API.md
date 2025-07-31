# AI Quick Ask API Integration

This document describes the API integration for the AI Quick Ask feature that allows users to ask questions about generated reports.

## Overview

The AI Quick Ask feature enables users to ask contextual questions about their fact-check or research reports. The feature is implemented as a sidebar component that appears alongside the Table of Contents when viewing report results.

## Frontend Implementation

### Component: `AIQuickAsk.vue`

Located at: `src/components/AIQuickAsk.vue`

**Props:**
- `sessionId` (String, required): The session ID of the current analysis
- `reportContent` (String, required): The full content of the report to provide context
- `visible` (Boolean, default: true): Controls component visibility

**Features:**
- Collapsible interface with header toggle
- Text area for question input
- Send button with loading states
- Response display area
- Clear functionality to reset question and response

### Integration in HomeView

The component is integrated into the three-column layout:
- Left: Table of Contents
- Center: Report Results
- Right: AI Quick Ask

**Layout Classes:**
- `.has-ai-ask`: Enables three-column grid layout
- `.ai-ask-wrapper`: Container for the AI Quick Ask component
- Responsive design collapses to single column on mobile devices

## Backend API Specification

### Endpoint: POST `/fact-check/{sessionId}/quick-ask/`

**Description:** Submit a question about the current analysis report and receive an AI-generated response.

**URL Parameters:**
- `sessionId`: The UUID of the analysis session

**Request Body:**
```json
{
  "question": "string",
  "report_content": "string"
}
```

**Request Fields:**
- `question` (required): The user's question about the report
- `report_content` (required): The full content of the report for context

**Response Format:**

**Success Response (200 OK):**
```json
{
  "status": "success",
  "answer": "string",
  "response_time": "float",
  "session_id": "string"
}
```

**Error Response (400 Bad Request):**
```json
{
  "status": "error",
  "message": "string",
  "details": "string"
}
```

**Error Response (404 Not Found):**
```json
{
  "status": "error",
  "message": "Session not found",
  "session_id": "string"
}
```

**Error Response (500 Internal Server Error):**
```json
{
  "status": "error",
  "message": "Internal server error",
  "details": "string"
}
```

## Service Implementation

### Frontend Service: `factCheckService.js`

**Method:** `quickAsk(sessionId, questionData)`

```javascript
async quickAsk(sessionId, questionData) {
  return this.makeRequestWithRetry(async () => {
    console.log('Quick ask request:', {
      sessionId,
      questionLength: questionData.question?.length,
      reportContentLength: questionData.reportContent?.length
    })
    
    const response = await this.axiosInstance.post(`/fact-check/${sessionId}/quick-ask/`, {
      question: questionData.question,
      report_content: questionData.reportContent
    }, {
      timeout: 60000 // 1 minute timeout for quick ask requests
    })
    
    console.log('Quick ask response:', response.status)
    return response.data
  })
}
```

**Features:**
- Automatic retry logic with exponential backoff
- 60-second timeout for requests
- Error handling and logging
- Request/response size logging for debugging

## Report Content Extraction

The `getReportContent()` function in HomeView extracts relevant content based on the analysis mode:

### Fact-Check Mode
Extracts:
- Verdict
- Confidence Score
- Summary
- Reasoning
- Sources

### Research Mode
Extracts:
- Section titles and content from summary array
- Formatted as readable text sections

### Fallback
- JSON stringified version of entire results object

## Error Handling

### Frontend Error Handling
- Loading states during API calls
- User-friendly error messages via Ant Design message component
- Graceful fallback for extraction errors
- Network error retry logic

### Expected Backend Errors
- **400**: Invalid request format or missing required fields
- **404**: Session not found or expired
- **429**: Rate limiting exceeded
- **500**: Internal server processing error
- **503**: Service temporarily unavailable

## UI/UX Features

### Visual Design
- Consistent styling with Table of Contents component
- Collapsible interface to save space
- Sticky positioning on desktop
- Mobile-responsive single-column layout

### User Interactions
- Enter key submission (without Shift)
- Loading indicators during processing
- Clear functionality to reset interface
- Smooth transitions and animations

### Accessibility
- Semantic HTML structure
- Keyboard navigation support
- Screen reader friendly labels
- High contrast design elements

## Usage Example

```javascript
// Component usage in template
<AIQuickAsk
  :sessionId="sessionId"
  :reportContent="getReportContent()"
  :visible="showToc"
/>

// Service usage
const result = await factCheckService.quickAsk(sessionId, {
  question: "What are the main sources supporting this claim?",
  reportContent: fullReportText
});

console.log(result.answer); // AI generated response
```

## Testing Considerations

### Frontend Testing
- Component rendering with different prop combinations
- API call mocking and error scenarios
- Responsive layout testing
- User interaction flows

### Backend Testing
- Question processing with various content lengths
- Session validation and error cases
- Response time and timeout handling
- Content extraction accuracy

## Security Considerations

- Session validation to prevent unauthorized access
- Input sanitization for user questions
- Rate limiting to prevent abuse
- Content length limits for large reports
- Proper error message exposure (no sensitive data)

## Performance Considerations

- Report content caching on frontend
- Debounced API calls if typing indicators added
- Lazy loading of component when not visible
- Memory management for large report content
- Connection timeout and retry strategies