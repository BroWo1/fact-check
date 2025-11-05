# Chat Feature - API Integration Guide

This document provides a comprehensive guide for integrating the chat feature with your backend API.

## Overview

The chat feature is currently using a **mock backend** for development and testing. To connect it to a real backend, you'll need to implement the API endpoints described below.

## Quick Start

1. **Toggle to Real API**: In `src/services/chatService.js`, change line 74:
   ```javascript
   const USE_MOCK = false // Set to false when real API is ready
   ```

2. **Implement Backend Endpoints**: Follow the API specification below

3. **Test Integration**: Test the chat flow end-to-end

---

## API Endpoints Specification

### Base URL
```
/api/chat
```

### 1. Send Message (Required)

**Endpoint**: `POST /api/chat/send`

**Purpose**: Send a user message and receive AI response

**Request Body**:
```json
{
  "conversation_id": "conv_1234567890_abc123",
  "message": "What is quantum computing?",
  "history": [
    {
      "role": "user",
      "content": "Previous user message",
      "timestamp": "2025-11-05T10:30:00Z"
    },
    {
      "role": "assistant",
      "content": "Previous assistant response",
      "timestamp": "2025-11-05T10:30:05Z"
    }
  ]
}
```

**Response**:
```json
{
  "message": "Quantum computing is a type of computing that uses quantum mechanics...",
  "timestamp": "2025-11-05T10:35:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Authentication required
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

---

### 2. Get Conversations (Optional - for backend sync)

**Endpoint**: `GET /api/chat/conversations`

**Purpose**: Retrieve user's conversation list

**Response**:
```json
[
  {
    "id": "conv_1234567890_abc123",
    "title": "Discussion about quantum computing",
    "createdAt": "2025-11-05T10:00:00Z",
    "updatedAt": "2025-11-05T10:35:00Z",
    "preview": "What is quantum computing? Quantum computing is..."
  }
]
```

---

### 3. Get Conversation (Optional - for backend sync)

**Endpoint**: `GET /api/chat/conversations/:id`

**Purpose**: Retrieve a specific conversation with full message history

**Response**:
```json
{
  "id": "conv_1234567890_abc123",
  "title": "Discussion about quantum computing",
  "messages": [
    {
      "id": "msg_1234567890_xyz789",
      "role": "user",
      "content": "What is quantum computing?",
      "timestamp": "2025-11-05T10:30:00Z"
    },
    {
      "id": "msg_1234567891_xyz790",
      "role": "assistant",
      "content": "Quantum computing is...",
      "timestamp": "2025-11-05T10:30:05Z"
    }
  ]
}
```

---

### 4. Delete Conversation (Optional - for backend sync)

**Endpoint**: `DELETE /api/chat/conversations/:id`

**Purpose**: Delete a conversation

**Response**:
```json
{
  "success": true
}
```

---

## Implementation Notes

### 1. Storage Strategy

**Current (Mock Mode)**:
- Conversations stored in browser localStorage
- No cross-device sync
- Data persists until cleared

**Recommended (Production)**:
- Store conversations in your database
- Associate with user accounts
- Enable cross-device sync
- Implement data retention policies

### 2. Context Management

**Conversation History**:
- The `history` parameter includes previous messages for context
- Limit context to last 10-20 messages to avoid token limits
- Consider implementing sliding window context

**Example**:
```javascript
// Only send recent messages for context
const recentHistory = conversation.messages.slice(-20)
```

### 3. Streaming Responses (Advanced)

For real-time message display, implement Server-Sent Events (SSE) or WebSocket:

**SSE Example**:
```javascript
// Backend
res.writeHead(200, {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive'
})

// Stream tokens as they're generated
for (const token of aiResponseStream) {
  res.write(`data: ${JSON.stringify({ token })}\n\n`)
}

res.write('data: [DONE]\n\n')
res.end()
```

**Frontend Integration**:
```javascript
// In chatService.js
const eventSource = new EventSource('/api/chat/send-stream')
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  if (data === '[DONE]') {
    eventSource.close()
  } else {
    // Update message with new token
    appendTokenToMessage(data.token)
  }
}
```

### 4. Rate Limiting

Implement rate limiting to prevent abuse:

**Recommended Limits**:
- 20 messages per minute per user
- 100 messages per hour per user
- Adjust based on your infrastructure

**Error Response**:
```json
{
  "error": "Rate limit exceeded",
  "retry_after": 60
}
```

### 5. Authentication & Authorization

**For User-Specific Conversations**:
```javascript
// Add authentication header
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN',
  'Content-Type': 'application/json'
}
```

**Backend Validation**:
- Verify JWT token
- Ensure user can only access their conversations
- Implement proper RBAC if needed

### 6. Error Handling

The frontend handles these error scenarios:

1. **Network Errors**: Auto-retry with exponential backoff
2. **Rate Limiting**: Show user-friendly message with countdown
3. **Authentication Errors**: Redirect to login
4. **Server Errors**: Allow manual retry

**Frontend Error Handler** (in `chatService.js`):
```javascript
handleError(error) {
  if (error.response?.status === 429) {
    return new Error('Too many requests. Please try again later.')
  }
  // ... other error cases
}
```

---

## Testing Checklist

Before going live with the real API:

- [ ] Test sending first message in a new conversation
- [ ] Test sending follow-up messages
- [ ] Test conversation persistence across page reloads
- [ ] Test error handling (network errors, server errors)
- [ ] Test rate limiting behavior
- [ ] Test authentication/authorization (if applicable)
- [ ] Test concurrent requests
- [ ] Load test with multiple users
- [ ] Test cross-device sync (if implemented)
- [ ] Test conversation deletion

---

## Mock Backend Reference

The current mock backend (`src/services/mockChatBackend.js`) provides:

1. **Simulated Network Delay**: 1 second
2. **Context-Aware Responses**: Based on message content
3. **Conversation History**: Acknowledges previous messages
4. **Example Topics**: AI, climate, health, technology, space

Use this as a reference for expected behavior.

---

## Migration Path

**Step 1**: Development
- Keep `USE_MOCK = true`
- Develop and test UI/UX

**Step 2**: Backend Integration
- Implement backend endpoints
- Test with Postman/curl
- Update `USE_MOCK = false`
- Test integration

**Step 3**: Production
- Add authentication
- Implement rate limiting
- Set up monitoring
- Deploy to production

---

## Performance Optimization

### 1. Response Time
- Target: < 2 seconds for most queries
- Use caching for common questions
- Optimize AI model inference

### 2. Scalability
- Use message queues for high load
- Implement connection pooling
- Consider CDN for static assets

### 3. Cost Optimization
- Cache responses for identical questions
- Implement conversation summarization for long contexts
- Use cheaper models for simple queries

---

## Security Considerations

1. **Input Validation**: Sanitize all user inputs
2. **Output Filtering**: Filter harmful content in AI responses
3. **Data Privacy**: Encrypt conversations at rest and in transit
4. **GDPR Compliance**: Implement data deletion on request
5. **Content Moderation**: Flag and review inappropriate content

---

## Support & Contact

For questions about the chat feature implementation:
1. Check the inline documentation in `src/services/chatService.js`
2. Review the composable in `src/composables/useChat.js`
3. Test with the mock backend first
4. Contact the development team for integration assistance

---

## Example Implementation (Node.js/Express)

```javascript
// Backend example
app.post('/api/chat/send', async (req, res) => {
  try {
    const { conversation_id, message, history } = req.body

    // Validate input
    if (!message || !conversation_id) {
      return res.status(400).json({ error: 'Invalid input' })
    }

    // Build context from history
    const context = history.map(msg => ({
      role: msg.role,
      content: msg.content
    }))

    // Call AI service (example with OpenAI)
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        ...context,
        { role: 'user', content: message }
      ]
    })

    const aiMessage = response.choices[0].message.content

    // Save to database
    await saveMessage(conversation_id, message, aiMessage)

    // Return response
    res.json({
      message: aiMessage,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Chat error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})
```

---

## Changelog

- **2025-11-05**: Initial chat feature implementation with mock backend
- **Future**: Plan to add streaming responses, voice input, file attachments

---

## License

This integration guide is part of the fact-check application documentation.
