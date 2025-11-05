<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { Input, Button, Spin } from 'ant-design-vue'
import { ArrowUp, User, Bot } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  messages: {
    type: Array,
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['send-message'])

const { t } = useI18n()

const inputText = ref('')
const messagesContainerRef = ref(null)
const scrollProgress = ref(0)
const showScrollIndicator = ref(false)

const handleSubmit = () => {
  if (!inputText.value.trim() || props.isLoading) return
  emit('send-message', inputText.value.trim())
  inputText.value = ''
}

const handleKeyPress = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSubmit()
  }
}

// Scroll to bottom when new messages arrive
watch(() => props.messages.length, async () => {
  await nextTick()
  scrollToBottom()
})

const scrollToBottom = () => {
  if (messagesContainerRef.value) {
    messagesContainerRef.value.scrollTop = messagesContainerRef.value.scrollHeight
  }
}

// Calculate scroll progress for timeline indicator
const updateScrollProgress = () => {
  if (!messagesContainerRef.value) return

  const container = messagesContainerRef.value
  const scrollTop = container.scrollTop
  const scrollHeight = container.scrollHeight
  const clientHeight = container.clientHeight

  // Show indicator only if there's content to scroll
  showScrollIndicator.value = scrollHeight > clientHeight

  if (scrollHeight > clientHeight) {
    scrollProgress.value = (scrollTop / (scrollHeight - clientHeight)) * 100
  } else {
    scrollProgress.value = 0
  }
}

// Format timestamp
const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  if (messagesContainerRef.value) {
    messagesContainerRef.value.addEventListener('scroll', updateScrollProgress)
    updateScrollProgress()
  }
  scrollToBottom()
})

onUnmounted(() => {
  if (messagesContainerRef.value) {
    messagesContainerRef.value.removeEventListener('scroll', updateScrollProgress)
  }
})
</script>

<template>
  <div class="chat-conversation">
    <!-- Timeline scroll indicator -->
    <div v-if="showScrollIndicator" class="timeline-indicator">
      <div class="timeline-track">
        <div
          class="timeline-progress"
          :style="{ height: `${scrollProgress}%` }"
        ></div>
      </div>
    </div>

    <!-- Messages container -->
    <div ref="messagesContainerRef" class="messages-container">
      <div class="messages-content">
        <div
          v-for="(message, index) in messages"
          :key="message.id"
          class="message-wrapper"
          :class="{ 'user-message': message.role === 'user', 'assistant-message': message.role === 'assistant' }"
        >
          <div class="message-avatar">
            <User v-if="message.role === 'user'" :size="20" />
            <Bot v-else :size="20" />
          </div>
          <div class="message-content">
            <div class="message-header">
              <span class="message-sender">
                {{ message.role === 'user' ? t('chat.you') : t('chat.assistant') }}
              </span>
              <span class="message-time">
                {{ formatTime(message.timestamp) }}
              </span>
            </div>
            <div class="message-text">
              {{ message.content }}
            </div>
          </div>
        </div>

        <!-- Loading indicator -->
        <div v-if="isLoading" class="message-wrapper assistant-message">
          <div class="message-avatar">
            <Bot :size="20" />
          </div>
          <div class="message-content">
            <div class="message-header">
              <span class="message-sender">{{ t('chat.assistant') }}</span>
            </div>
            <div class="message-text loading-message">
              <Spin size="small" />
              <span>{{ t('chat.thinking') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Input area -->
    <div class="input-area">
      <div class="input-wrapper">
        <Input.TextArea
          v-model:value="inputText"
          :placeholder="t('chat.messageInputPlaceholder')"
          :rows="3"
          class="message-input"
          :disabled="isLoading"
          @keypress="handleKeyPress"
        />
        <Button
          type="primary"
          class="send-button"
          :disabled="!inputText.trim() || isLoading"
          :loading="isLoading"
          @click="handleSubmit"
        >
          <ArrowUp :size="16" />
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-conversation {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  position: relative;
}

/* Timeline indicator */
.timeline-indicator {
  position: absolute;
  right: 20px;
  top: 20px;
  bottom: 140px;
  width: 4px;
  z-index: 10;
  pointer-events: none;
}

.timeline-track {
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.timeline-progress {
  width: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition: height 0.1s ease;
  border-radius: 2px;
}

/* Messages container */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  padding-right: 40px;
}

.messages-container::-webkit-scrollbar {
  width: 8px;
}

.messages-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.messages-container::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

.messages-content {
  max-width: 900px;
  margin: 0 auto;
}

/* Message wrapper */
.message-wrapper {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: white;
  font-weight: 600;
}

.user-message .message-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.assistant-message .message-avatar {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.message-sender {
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
}

.message-time {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.4);
}

.message-text {
  background: white;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 15px;
  line-height: 1.6;
  color: rgba(0, 0, 0, 0.85);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  word-wrap: break-word;
  white-space: pre-wrap;
}

.user-message .message-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.loading-message {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(0, 0, 0, 0.6);
}

/* Input area */
.input-area {
  padding: 20px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.input-wrapper {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  gap: 12px;
  align-items: flex-end;
  background: white;
  padding: 12px;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.message-input {
  flex: 1;
  border: none !important;
  padding: 0 !important;
  font-size: 15px !important;
  resize: none;
}

.message-input:focus {
  box-shadow: none !important;
}

.send-button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  flex-shrink: 0;
}

.send-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #7c8fef 0%, #8b5cb3 100%);
}

.send-button:disabled {
  background: rgba(0, 0, 0, 0.1);
}

@media (max-width: 768px) {
  .timeline-indicator {
    right: 10px;
  }

  .messages-container {
    padding: 16px;
    padding-right: 24px;
  }

  .input-area {
    padding: 12px;
  }
}
</style>
