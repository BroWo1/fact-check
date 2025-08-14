<template>
  <div class="ai-chat-panel">
    <div class="chat-header">
      <div class="header-title">
        <h3>{{ t('workspace.aiAssistant') }}</h3>
        <span class="dev-badge">IN DEVELOPMENT</span>
      </div>
      <Button 
        class="clear-chat-btn"
        size="small"
        @click="clearChat"
        v-if="chatHistory.length > 0"
        disabled
      >
        {{ t('workspace.clearChat') }}
      </Button>
    </div>

    <div class="chat-messages" ref="messagesContainer">
      <div v-if="chatHistory.length === 0" class="empty-chat">
        <div class="welcome-message">
          <div class="ai-avatar">🚧</div>
          <h4 class="dev-title">AI Assistant - In Development</h4>
          <p class="dev-message">
            The AI Assistant is currently under development and temporarily unavailable. 
            This feature will allow you to interact with your workspace content using natural language.
          </p>
          <div class="coming-soon">
            <p><strong>Coming Soon:</strong></p>
            <ul class="feature-list">
              <li>Analyze documents and research</li>
              <li>Generate summaries and insights</li>
              <li>Answer questions about your content</li>
              <li>Create new documents from conversations</li>
            </ul>
          </div>
        </div>
      </div>

      <div
        v-for="message in chatHistory"
        :key="message.id"
        class="message"
        :class="{ 'user-message': message.role === 'user', 'ai-message': message.role === 'assistant' }"
      >
        <div class="message-avatar">
          <span v-if="message.role === 'user'">👤</span>
          <span v-else>🤖</span>
        </div>
        <div class="message-content">
          <div class="message-text" v-html="formatMessage(message.content)"></div>
          <div class="message-time">{{ formatTime(message.timestamp) }}</div>
          <div v-if="message.role === 'assistant' && message.canvasActions" class="canvas-actions">
            <Button
              v-for="action in message.canvasActions"
              :key="action.id"
              class="canvas-action-btn"
              size="small"
              @click="handleCanvasAction(action)"
            >
              {{ action.label }}
            </Button>
          </div>
        </div>
      </div>

      <div v-if="isLoading" class="message ai-message">
        <div class="message-avatar">🤖</div>
        <div class="message-content">
          <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>

    <div class="chat-input">
      <div class="input-container">
        <Input.TextArea
          v-model:value="inputMessage"
          placeholder="AI Assistant is temporarily unavailable..."
          :rows="2"
          class="message-input disabled-input"
          @keydown="handleKeyDown"
          disabled
        />
        <Button
          type="primary"
          class="send-btn"
          @click="sendMessage"
          disabled
        >
          <Send :size="16" />
        </Button>
      </div>
      
      <div class="quick-actions">
        <div class="quick-actions-disabled">
          <p class="quick-actions-notice">Quick actions will be available when AI Assistant is enabled</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { Button, Input, Modal } from 'ant-design-vue'
import { Send } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const props = defineProps({
  workspace: Object
})

const emit = defineEmits(['send-message'])

const inputMessage = ref('')
const isLoading = ref(false)
const messagesContainer = ref(null)

const chatHistory = computed(() => props.workspace?.chatHistory || [])

const suggestions = computed(() => [
  t('workspace.suggestions.analyzeCanvas'),
  t('workspace.suggestions.createDocument'),
  t('workspace.suggestions.factCheck')
])

const quickActions = computed(() => [
  { id: 'add-research', label: t('workspace.addResearch') },
  { id: 'add-factcheck', label: t('workspace.addFactCheck') },
  { id: 'add-document', label: t('workspace.addDocument') },
  { id: 'add-webpage', label: t('workspace.addWebpage') }
])

const sendMessage = async () => {
  if (!inputMessage.value.trim() || isLoading.value) return
  
  const userMessage = {
    role: 'user',
    content: inputMessage.value.trim()
  }
  
  emit('send-message', userMessage)
  inputMessage.value = ''
  
  scrollToBottom()
  
  isLoading.value = true
  
  try {
    await simulateAIResponse(userMessage.content)
  } finally {
    isLoading.value = false
  }
}

const sendSuggestion = (suggestion) => {
  inputMessage.value = suggestion
  sendMessage()
}

const simulateAIResponse = async (userMessage) => {
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
  
  let response = generateAIResponse(userMessage)
  let canvasActions = null
  
  if (userMessage.toLowerCase().includes('add') || userMessage.toLowerCase().includes('create')) {
    canvasActions = [
      { id: 'create-canvas', label: t('workspace.addToCanvas'), type: 'document' }
    ]
  }
  
  const aiMessage = {
    role: 'assistant',
    content: response,
    canvasActions
  }
  
  emit('send-message', aiMessage)
  scrollToBottom()
}

const generateAIResponse = (userMessage) => {
  const responses = [
    t('workspace.aiResponses.help'),
    t('workspace.aiResponses.analyze'),
    t('workspace.aiResponses.create'),
    t('workspace.aiResponses.research')
  ]
  
  if (userMessage.toLowerCase().includes('fact') || userMessage.toLowerCase().includes('check')) {
    return t('workspace.aiResponses.factCheck')
  }
  
  if (userMessage.toLowerCase().includes('research')) {
    return t('workspace.aiResponses.research')
  }
  
  if (userMessage.toLowerCase().includes('create') || userMessage.toLowerCase().includes('add')) {
    return t('workspace.aiResponses.create')
  }
  
  return responses[Math.floor(Math.random() * responses.length)]
}

const handleQuickAction = (action) => {
  emit('send-message', {
    role: 'system',
    content: `Quick action: ${action.label}`,
    action: action.id
  })
}

const handleCanvasAction = (action) => {
  emit('send-message', {
    role: 'system',
    content: `Canvas action: ${action.label}`,
    canvasAction: action
  })
}

const clearChat = () => {
  Modal.confirm({
    title: 'Clear Chat History',
    content: t('workspace.confirmClearChat'),
    okText: 'Yes, Clear',
    okType: 'danger',
    cancelText: 'Cancel',
    onOk() {
      props.workspace.chatHistory.length = 0
    }
  })
}

const handleKeyDown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

const formatMessage = (content) => {
  return content.replace(/\n/g, '<br>')
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

onMounted(() => {
  scrollToBottom()
})
</script>

<style scoped>
.ai-chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dev-badge {
  background: #ff9c00;
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 6px;
  border-radius: 4px;
  letter-spacing: 0.5px;
}

.chat-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.clear-chat-btn {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  color: #666;
  font-size: 12px;
}

.clear-chat-btn:hover {
  background: #e9ecef;
  border-color: #666;
  color: #333;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-chat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
}

.welcome-message {
  max-width: 280px;
}

.ai-avatar {
  font-size: 48px;
  margin-bottom: 16px;
}

.welcome-message p {
  color: #666;
  margin-bottom: 20px;
  line-height: 1.5;
}

.dev-title {
  color: #ff9c00;
  font-size: 18px;
  font-weight: 600;
  margin: 16px 0 12px 0;
}

.dev-message {
  color: #666;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 20px;
}

.coming-soon {
  background: #fff7e6;
  border: 1px solid #ffd666;
  border-radius: 8px;
  padding: 16px;
  text-align: left;
  max-width: 320px;
}

.coming-soon p {
  color: #d46b08;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.feature-list {
  color: #8c6800;
  font-size: 13px;
  line-height: 1.5;
  margin: 0;
  padding-left: 16px;
}

.feature-list li {
  margin-bottom: 4px;
}

.suggested-questions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.suggestion-btn {
  background: #f0f7ff;
  border: 1px solid #d0e7ff;
  color: #1890ff;
  font-size: 12px;
  text-align: left;
}

.suggestion-btn:hover {
  background: #e6f4ff;
  border-color: #91caff;
}

.message {
  display: flex;
  gap: 12px;
  animation: fadeIn 0.3s ease;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.user-message .message-avatar {
  background: #e6f4ff;
}

.ai-message .message-avatar {
  background: #f6ffed;
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-text {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  word-wrap: break-word;
}

.user-message .message-text {
  background: #e6f4ff;
  margin-left: auto;
  margin-right: 0;
  max-width: 80%;
}

.ai-message .message-text {
  background: #f6ffed;
}

.message-time {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
  padding: 0 12px;
}

.canvas-actions {
  margin-top: 8px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.canvas-action-btn {
  background: #fff;
  border: 1px solid #d9d9d9;
  color: #666;
  font-size: 12px;
}

.canvas-action-btn:hover {
  background: #f5f5f5;
  border-color: #999;
  color: #333;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 12px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #999;
  animation: typing 1.5s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

.chat-input {
  border-top: 1px solid #e9ecef;
  padding: 16px;
  background: #fff;
}

.input-container {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.message-input {
  flex: 1;
  border-radius: 8px;
  resize: none;
}

.send-btn {
  height: 40px;
  min-width: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quick-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.quick-action-btn {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  color: #666;
  font-size: 11px;
}

.quick-action-btn:hover {
  background: #e9ecef;
  border-color: #666;
  color: #333;
}

.disabled-input {
  background-color: #f5f5f5 !important;
  cursor: not-allowed !important;
}

.quick-actions-disabled {
  text-align: center;
  width: 100%;
}

.quick-actions-notice {
  color: #999;
  font-size: 12px;
  font-style: italic;
  margin: 0;
  padding: 8px 0;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes typing {
  0%, 60%, 100% { transform: scale(1); opacity: 0.5; }
  30% { transform: scale(1.2); opacity: 1; }
}

.chat-messages::-webkit-scrollbar {
  width: 4px;
}

.chat-messages::-webkit-scrollbar-track {
  background: #f8f9fa;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: #e9ecef;
  border-radius: 2px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: #d0d0d0;
}
</style>