import { ref, reactive, computed } from 'vue'
import chatService from '../services/chatService'

export function useChat() {
  const isLoading = ref(false)
  const currentConversationId = ref(null)
  const conversations = ref([])
  const currentMessages = ref([])
  const error = ref(null)

  // Load conversations from localStorage on init
  const loadConversations = () => {
    try {
      const saved = localStorage.getItem('chat-conversations')
      if (saved) {
        conversations.value = JSON.parse(saved)
      }
    } catch (err) {
      console.error('Failed to load conversations:', err)
    }
  }

  // Save conversations to localStorage
  const saveConversations = () => {
    try {
      localStorage.setItem('chat-conversations', JSON.stringify(conversations.value))
    } catch (err) {
      console.error('Failed to save conversations:', err)
    }
  }

  // Create a new conversation
  const createConversation = (firstMessage) => {
    const conversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: firstMessage.substring(0, 50) + (firstMessage.length > 50 ? '...' : ''),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: []
    }

    conversations.value.unshift(conversation)
    saveConversations()
    return conversation
  }

  // Get conversation by ID
  const getConversation = (conversationId) => {
    return conversations.value.find(c => c.id === conversationId)
  }

  // Update conversation
  const updateConversation = (conversationId, updates) => {
    const index = conversations.value.findIndex(c => c.id === conversationId)
    if (index !== -1) {
      conversations.value[index] = {
        ...conversations.value[index],
        ...updates,
        updatedAt: new Date().toISOString()
      }
      saveConversations()
    }
  }

  // Delete conversation
  const deleteConversation = (conversationId) => {
    conversations.value = conversations.value.filter(c => c.id !== conversationId)
    saveConversations()
    if (currentConversationId.value === conversationId) {
      currentConversationId.value = null
      currentMessages.value = []
    }
  }

  // Send a message
  const sendMessage = async (conversationId, messageText) => {
    isLoading.value = true
    error.value = null

    try {
      const conversation = getConversation(conversationId)
      if (!conversation) {
        throw new Error('Conversation not found')
      }

      // Add user message
      const userMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'user',
        content: messageText,
        timestamp: new Date().toISOString()
      }

      conversation.messages.push(userMessage)
      currentMessages.value = [...conversation.messages]
      updateConversation(conversationId, { messages: conversation.messages })

      // Get AI response from backend (or mock)
      const response = await chatService.sendMessage(conversationId, messageText, conversation.messages)

      // Add assistant message
      const assistantMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString()
      }

      conversation.messages.push(assistantMessage)
      currentMessages.value = [...conversation.messages]
      updateConversation(conversationId, { messages: conversation.messages })

      isLoading.value = false
      return assistantMessage

    } catch (err) {
      console.error('Failed to send message:', err)
      error.value = err.message || 'Failed to send message'
      isLoading.value = false
      throw err
    }
  }

  // Load conversation messages
  const loadConversation = (conversationId) => {
    const conversation = getConversation(conversationId)
    if (conversation) {
      currentConversationId.value = conversationId
      currentMessages.value = [...conversation.messages]
      return conversation
    }
    return null
  }

  // Initialize
  loadConversations()

  return {
    isLoading,
    currentConversationId,
    conversations,
    currentMessages,
    error,
    createConversation,
    getConversation,
    updateConversation,
    deleteConversation,
    sendMessage,
    loadConversation,
    loadConversations,
    saveConversations
  }
}
