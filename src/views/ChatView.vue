<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useChat } from '../composables/useChat'
import { useI18n } from 'vue-i18n'
import ChatSidebar from '../components/chat/ChatSidebar.vue'
import ChatHome from '../components/chat/ChatHome.vue'
import ChatConversation from '../components/chat/ChatConversation.vue'
import SettingsModal from '../components/SettingsModal.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

// Use chat composable
const {
  isLoading,
  currentConversationId,
  conversations,
  currentMessages,
  error,
  createConversation,
  deleteConversation,
  sendMessage,
  loadConversation
} = useChat()

const showSettingsModal = ref(false)

// Load conversation when route changes
watch(() => route.params.conversationId, (conversationId) => {
  if (conversationId) {
    loadConversation(conversationId)
  } else {
    currentConversationId.value = null
    currentMessages.value = []
  }
}, { immediate: true })

// Handle sending the first message (from home view)
const handleSendFirstMessage = async (messageText) => {
  try {
    // Create new conversation
    const conversation = createConversation(messageText)

    // Load the conversation
    loadConversation(conversation.id)

    // Send the message
    await sendMessage(conversation.id, messageText)

    // Navigate to the conversation
    router.push(`/chat/${conversation.id}`)
  } catch (err) {
    console.error('Failed to send first message:', err)
  }
}

// Handle sending a message in existing conversation
const handleSendMessage = async (messageText) => {
  if (!currentConversationId.value) return

  try {
    await sendMessage(currentConversationId.value, messageText)
  } catch (err) {
    console.error('Failed to send message:', err)
  }
}

// Handle conversation selection
const handleSelectConversation = (conversationId) => {
  loadConversation(conversationId)
}

// Handle conversation deletion
const handleDeleteConversation = (conversationId) => {
  deleteConversation(conversationId)

  // If we're currently viewing the deleted conversation, go to home
  if (currentConversationId.value === conversationId) {
    router.push('/chat')
  }
}

// Handle new conversation
const handleNewConversation = () => {
  currentConversationId.value = null
  currentMessages.value = []
  router.push('/chat')
}

// Handle settings
const handleOpenSettings = () => {
  showSettingsModal.value = true
}

// Check if we're on the home view (no conversation selected)
const isHomeView = computed(() => !route.params.conversationId)
</script>

<template>
  <div class="chat-view">
    <ChatSidebar
      :conversations="conversations"
      :currentConversationId="currentConversationId"
      @select-conversation="handleSelectConversation"
      @delete-conversation="handleDeleteConversation"
      @new-conversation="handleNewConversation"
      @open-settings="handleOpenSettings"
    />

    <div class="chat-main">
      <ChatHome
        v-if="isHomeView"
        @send-message="handleSendFirstMessage"
      />
      <ChatConversation
        v-else
        :messages="currentMessages"
        :isLoading="isLoading"
        @send-message="handleSendMessage"
      />
    </div>

    <!-- Settings Modal -->
    <SettingsModal
      :visible="showSettingsModal"
      @close="showSettingsModal = false"
    />
  </div>
</template>

<style scoped>
.chat-view {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.chat-main {
  flex: 1;
  overflow: hidden;
}

@media (max-width: 768px) {
  .chat-view {
    position: relative;
  }
}
</style>
