# Fact-Check Frontend Integration

Your Vue.js frontend has been successfully integrated with the enhanced Django backend API for real-time multi-step fact-checking analysis!

## 🎯 Features Implemented

### ✅ Core Functionality
- **Real-time WebSocket Updates**: Live progress tracking during analysis
- **Polling Fallback**: Automatic fallback when WebSocket connection fails
- **Multi-step Analysis Tracking**: Visual progress through 4 analysis phases
- **Enhanced Error Handling**: User-friendly error messages with retry logic
- **Image Upload Support**: Both text and image fact-checking capabilities
- **Session Management**: Analysis session caching and restoration

### ✅ Advanced Features
- **Retry Logic**: Exponential backoff for failed API requests
- **Connection Status**: Real-time connection status indicators
- **Progress Caching**: Session data caching for reliability
- **Mobile Responsive**: Optimized for all device sizes
- **Accessibility**: Screen reader support and ARIA labels

## 🏗️ Architecture Overview

```
Vue Frontend ←→ Vite Proxy ←→ Django API ←→ Celery Tasks ←→ AI Services
     ↕              ↕            ↕             ↕             ↕
WebSocket ←→ Direct Connection ←→ Channels ←→ Progress ←→ Step Updates
Updates      (no proxy)          Consumer     Tracking
```

## 📁 Project Structure

```
src/
├── services/
│   ├── config.js                  # API configuration
│   ├── factCheckService.js        # REST API service with retry logic
│   └── websocketService.js        # WebSocket management
├── composables/
│   └── useFactCheck.js            # Reactive state management
├── components/
│   ├── AnalysisProgress.vue       # Real-time progress display
│   └── FactCheckResults.vue       # Comprehensive results display
└── App.vue                        # Main application component
```

## 🚀 Key Integration Points

### 1. Analysis Workflow
```javascript
// Start analysis
await startFactCheck(userInput, uploadedFile)

// Real-time updates via WebSocket
WebSocket → Progress Updates → UI Updates

// Fallback to polling if WebSocket fails
Polling API → Status Checks → UI Updates

// Display comprehensive results
Final Results → Sources → Evidence → Verdict
```

### 2. Progress Tracking
The system tracks 4 main analysis phases:
- **Initial Web Search** 🔍 - Finding credible sources
- **Deeper Exploration** 🔬 - Detailed research
- **Source Credibility Evaluation** ⚖️ - Assessing source reliability
- **Final Conclusion** 📋 - Generating verdict

### 3. Connection Management
- **Primary**: WebSocket for real-time updates
- **Fallback**: HTTP polling every 2 seconds
- **Status Indicators**: Visual connection status
- **Auto-retry**: Exponential backoff for failed connections

## 🔧 Configuration

### Environment Variables
```bash
# .env.local
VITE_API_URL=/api                    # Proxied through Vite
VITE_WS_URL=ws://localhost:8000/ws   # Direct WebSocket connection
```

### Vite Proxy Configuration
```javascript
// vite.config.js
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
      secure: false,
    }
  }
}
```

## 🎮 Usage Examples

### Basic Fact-Check
```javascript
// In your component
const { startFactCheck, isLoading, results, error } = useFactCheck()

// Start analysis
await startFactCheck("The Earth is flat")

// Monitor progress
watch(progress, (newProgress) => {
  console.log(`${newProgress.percentage}% complete`)
})

// Handle results
watch(results, (newResults) => {
  if (newResults) {
    console.log(`Verdict: ${newResults.verdict}`)
    console.log(`Confidence: ${newResults.confidence_score * 100}%`)
  }
})
```

### With Image Upload
```javascript
const fileInput = document.getElementById('image-input')
const file = fileInput.files[0]

await startFactCheck("Check this screenshot", file)
```

### Error Handling
```javascript
try {
  await startFactCheck(userInput)
} catch (error) {
  if (error.type === 'network_error') {
    // Show offline message
  } else if (error.status === 429) {
    // Show rate limit message
  } else if (error.status === 413) {
    // File too large
  }
}
```

## 📊 Real-time Updates

### WebSocket Message Types
```javascript
// Step update
{
  type: 'step_update',
  step_type: 'initial_web_search',
  description: 'Searching for credible sources...',
  progress_percentage: 25.0,
  timestamp: '2025-07-04T...'
}

// Progress update
{
  type: 'progress_update',
  progress: {
    progress_percentage: 50.0,
    completed_steps: 2,
    expected_steps: 4
  }
}

// Analysis complete
{
  type: 'analysis_complete',
  result: {
    success: true,
    verdict: 'false',
    confidence_score: 0.92
  }
}
```

### Polling Fallback
When WebSocket fails, the system automatically:
1. Switches to HTTP polling mode
2. Polls status endpoint every 2 seconds
3. Updates UI with latest progress
4. Shows "Using status polling" indicator

## 🎨 UI Components

### AnalysisProgress Component
- **Progress Bar**: Visual progress indicator
- **Current Step**: Active analysis phase
- **Connection Status**: WebSocket/polling indicator
- **Step History**: Expandable detailed steps
- **Time Stamps**: When each step completed

### FactCheckResults Component
- **Verdict Badge**: Color-coded verdict with confidence
- **Evidence Sections**: Supporting/contradictory evidence
- **Source List**: Credible sources with credibility scores
- **Analysis Details**: Comprehensive reasoning
- **Limitations**: Analysis limitations and recommendations

## 🔍 Debugging

### Console Logging
The integration provides detailed console logging:
```javascript
// WebSocket events
WebSocket connected for session: abc123
WebSocket message received: { type: 'step_update', ... }

// Polling fallback
WebSocket failed, falling back to polling
Starting status polling...

// Progress updates
Updating progress: 75% complete
Current step: Evaluating source credibility
```

### Network Tab
Monitor these endpoints:
- `POST /api/fact-check/` - Start analysis
- `GET /api/fact-check/{session_id}/status/` - Polling updates
- `GET /api/fact-check/{session_id}/results/` - Final results
- `WebSocket /ws/fact-check/{session_id}/` - Real-time updates

## 🚦 Backend Requirements

Your Django backend should provide:

### REST Endpoints
- `POST /api/fact-check/` → Create session, start analysis
- `GET /api/fact-check/{session_id}/status/` → Current progress
- `GET /api/fact-check/{session_id}/results/` → Final results
- `GET /api/health/` → Service health check

### WebSocket Endpoint
- `ws://localhost:8000/ws/fact-check/{session_id}/` → Real-time updates

### Expected Response Formats
```javascript
// Status response
{
  "session_id": "abc123",
  "status": "analyzing",
  "progress_percentage": 60.0,
  "completed_steps": 2,
  "expected_steps": 4,
  "current_step": {
    "step_type": "source_credibility_evaluation",
    "description": "Evaluating source credibility..."
  }
}

// Results response
{
  "verdict": "false",
  "confidence_score": 0.92,
  "summary": "Analysis summary...",
  "reasoning": "Detailed reasoning...",
  "sources": [...],
  "key_evidence": [...],
  "supporting_evidence": [...],
  "contradictory_evidence": [...]
}
```

## 🚀 Running the Application

### Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Backend should be running on http://localhost:8000
```

### Testing the Integration
1. **Start your Django backend** on port 8000
2. **Start the frontend**: `npm run dev`
3. **Submit a test claim**: "The Earth is flat"
4. **Observe real-time progress** in the browser
5. **Check console logs** for debugging information
6. **View comprehensive results** when analysis completes

## 🎯 Performance Optimizations

### Implemented Optimizations
- **Debounced Updates**: Progress updates throttled to 100ms
- **Connection Pooling**: Reuse HTTP connections
- **Lazy Loading**: Results component loaded on demand
- **Caching**: Session data cached in localStorage
- **Timeouts**: Automatic cleanup after 10 minutes

### Browser Support
- **Modern Browsers**: Full WebSocket support
- **Legacy Browsers**: Automatic polling fallback
- **Mobile Browsers**: Optimized touch interactions

## 🔐 Security Considerations

### CORS Configuration
- Vite proxy handles CORS in development
- Production needs proper CORS headers from Django

### Input Validation
- Client-side validation before API calls
- File type/size validation for uploads
- XSS protection through Vue's built-in escaping

## 📱 Mobile Optimization

The integration is fully mobile-responsive:
- **Touch-friendly**: Large touch targets
- **Responsive Design**: Adapts to all screen sizes
- **Progressive Enhancement**: Works without JavaScript
- **Fast Loading**: Optimized bundle size

## 🎉 Success!

Your Vue.js frontend is now fully integrated with the Django backend, providing:
- ⚡ **Real-time updates** during analysis
- 🔄 **Automatic fallbacks** for reliability
- 📊 **Comprehensive results** display
- 🎨 **Beautiful UI** with smooth animations
- 📱 **Mobile-first** responsive design

The integration handles all edge cases and provides a seamless user experience for fact-checking both text and images!
