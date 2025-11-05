/**
 * Mock Chat Backend Service
 *
 * This simulates the chat API responses for development and testing.
 * Replace this with the actual chatService.js implementation when the real API is ready.
 */

class MockChatBackend {
  constructor() {
    this.delay = 1000 // Simulate network delay (ms)
  }

  /**
   * Simulate sending a message and getting a response
   *
   * @param {string} conversationId - The conversation ID
   * @param {string} messageText - The user's message
   * @param {Array} messageHistory - Previous messages in the conversation
   * @returns {Promise<Object>} - Response object with message
   */
  async sendMessage(conversationId, messageText, messageHistory = []) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, this.delay))

    // Generate a mock response based on the message
    const response = this.generateMockResponse(messageText, messageHistory)

    return {
      success: true,
      message: response,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Generate a contextual mock response
   */
  generateMockResponse(messageText, messageHistory) {
    const lowerMessage = messageText.toLowerCase()

    // Context-aware responses
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return "Hello! I'm your AI assistant. How can I help you today?"
    }

    if (lowerMessage.includes('weather')) {
      return "I don't have real-time weather data, but I can help you understand weather patterns, climate science, or recommend weather apps and resources!"
    }

    if (lowerMessage.includes('fact check') || lowerMessage.includes('verify')) {
      return "For fact-checking specific claims, I recommend using the Fact-Check mode from the main menu. I can help answer general questions and have conversations here in chat mode."
    }

    if (lowerMessage.includes('research')) {
      return "For in-depth research on topics, try the Research mode from the main menu. Here in chat, I can have quick conversations and answer questions!"
    }

    if (lowerMessage.includes('how are you') || lowerMessage.includes('how do you do')) {
      return "I'm functioning well, thank you for asking! I'm here to help answer your questions and have a conversation. What's on your mind?"
    }

    if (lowerMessage.includes('thank')) {
      return "You're welcome! Feel free to ask me anything else."
    }

    if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye')) {
      return "Goodbye! Feel free to return anytime you have questions. Have a great day!"
    }

    // Check if this is the first message
    if (messageHistory.length === 0) {
      return `Thanks for your question about "${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}".

This is a mock response from the chat system. Here's what I can tell you:

${this.generateTopicResponse(messageText)}

Would you like to know more about any specific aspect?`
    }

    // Contextual follow-up response
    return `I understand you're asking about "${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}".

${this.generateFollowUpResponse(messageText, messageHistory)}

Is there anything specific you'd like me to elaborate on?`
  }

  /**
   * Generate a topic-specific response
   */
  generateTopicResponse(message) {
    const topics = {
      'ai': 'Artificial Intelligence is a broad field covering machine learning, neural networks, and natural language processing. AI systems can learn from data and make decisions with minimal human intervention.',
      'climate': 'Climate change refers to long-term shifts in global temperatures and weather patterns. The primary cause is human activities, particularly the emission of greenhouse gases.',
      'health': 'Health and wellness encompass physical, mental, and social well-being. A balanced diet, regular exercise, and adequate sleep are fundamental pillars of good health.',
      'technology': 'Technology continues to evolve rapidly, transforming how we live, work, and communicate. From smartphones to cloud computing, innovation drives progress.',
      'space': 'Space exploration has advanced significantly, with missions to Mars, the International Space Station, and private companies like SpaceX pushing boundaries.',
      'default': 'This is an interesting topic. There are multiple perspectives and considerations to explore here.'
    }

    const lowerMessage = message.toLowerCase()
    for (const [keyword, response] of Object.entries(topics)) {
      if (keyword !== 'default' && lowerMessage.includes(keyword)) {
        return response
      }
    }

    return topics.default
  }

  /**
   * Generate a follow-up response
   */
  generateFollowUpResponse(message, history) {
    const responses = [
      "That's a great follow-up question. Let me provide more context on that aspect.",
      "Building on our previous discussion, here's what you should know about this.",
      "I can see you're diving deeper into this topic. Here are some additional insights.",
      "To expand on what we discussed earlier, consider these points.",
      "That's an important detail to explore. Here's more information."
    ]

    return responses[Math.floor(Math.random() * responses.length)]
  }
}

export default new MockChatBackend()
