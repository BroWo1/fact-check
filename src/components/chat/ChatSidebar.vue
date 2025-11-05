<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Button, Modal } from 'ant-design-vue'
import { Settings, MessageSquare, Trash2, Plus } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  conversations: {
    type: Array,
    default: () => []
  },
  currentConversationId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['select-conversation', 'delete-conversation', 'new-conversation', 'open-settings'])

const { t } = useI18n()
const router = useRouter()

const handleLogoClick = () => {
  router.push('/chat')
}

const handleConversationClick = (conversation) => {
  emit('select-conversation', conversation.id)
  router.push(`/chat/${conversation.id}`)
}

const handleDeleteConversation = (conversationId, event) => {
  event.stopPropagation()
  Modal.confirm({
    title: t('chat.deleteConversationTitle'),
    content: t('chat.deleteConversationMessage'),
    okText: t('chat.delete'),
    okType: 'danger',
    cancelText: t('chat.cancel'),
    onOk() {
      emit('delete-conversation', conversationId)
    }
  })
}

const handleNewConversation = () => {
  emit('new-conversation')
  router.push('/chat')
}

const handleSettingsClick = () => {
  emit('open-settings')
}

// Format timestamp to relative time
const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 7) {
    return date.toLocaleDateString()
  } else if (days > 0) {
    return `${days}d ago`
  } else if (hours > 0) {
    return `${hours}h ago`
  } else if (minutes > 0) {
    return `${minutes}m ago`
  } else {
    return 'Just now'
  }
}
</script>

<template>
  <div class="chat-sidebar">
    <!-- Top: Logo -->
    <div class="sidebar-top">
      <div class="logo-section" @click="handleLogoClick">
        <img
          src="../../assets/itlookslegitTrans.png"
          alt="Logo"
          class="logo-image"
        />
      </div>
      <Button
        type="primary"
        class="new-conversation-button"
        @click="handleNewConversation"
      >
        <Plus :size="16" />
        {{ t('chat.newConversation') }}
      </Button>
    </div>

    <!-- Middle: Conversations list -->
    <div class="sidebar-middle">
      <div class="conversations-header">
        <MessageSquare :size="16" />
        <span>{{ t('chat.conversations') }}</span>
      </div>
      <div class="conversations-list">
        <div
          v-for="conversation in conversations"
          :key="conversation.id"
          class="conversation-item"
          :class="{ active: conversation.id === currentConversationId }"
          @click="handleConversationClick(conversation)"
        >
          <div class="conversation-content">
            <div class="conversation-title">{{ conversation.title }}</div>
            <div class="conversation-meta">
              {{ formatTimestamp(conversation.updatedAt) }}
            </div>
          </div>
          <Button
            class="delete-button"
            size="small"
            type="text"
            danger
            @click="(e) => handleDeleteConversation(conversation.id, e)"
          >
            <Trash2 :size="14" />
          </Button>
        </div>
        <div v-if="conversations.length === 0" class="empty-state">
          <MessageSquare :size="32" style="opacity: 0.3; margin-bottom: 8px;" />
          <p>{{ t('chat.noConversations') }}</p>
        </div>
      </div>
    </div>

    <!-- Bottom: Settings -->
    <div class="sidebar-bottom">
      <Button
        class="settings-button"
        @click="handleSettingsClick"
        block
      >
        <Settings :size="16" />
        {{ t('settings.title') }}
      </Button>
    </div>
  </div>
</template>

<style scoped>
.chat-sidebar {
  width: 280px;
  height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.3);
}

.sidebar-top {
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo-section {
  margin-bottom: 16px;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.logo-section:hover {
  transform: scale(1.05);
}

.logo-image {
  height: 48px;
  width: auto;
}

.new-conversation-button {
  width: 100%;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  font-weight: 600;
  font-size: 14px;
}

.new-conversation-button:hover {
  background: linear-gradient(135deg, #7c8fef 0%, #8b5cb3 100%);
}

.sidebar-middle {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 16px 0;
}

.conversations-header {
  padding: 0 20px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.conversations-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 12px;
}

.conversations-list::-webkit-scrollbar {
  width: 6px;
}

.conversations-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.conversations-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.conversations-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.conversation-item {
  padding: 12px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: rgba(255, 255, 255, 0.05);
}

.conversation-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.conversation-item.active {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%);
  border-left: 3px solid #667eea;
}

.conversation-content {
  flex: 1;
  min-width: 0;
}

.conversation-title {
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.conversation-meta {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}

.delete-button {
  opacity: 0;
  transition: opacity 0.2s ease;
  color: rgba(255, 255, 255, 0.6);
  padding: 4px;
  height: auto;
  min-width: auto;
}

.conversation-item:hover .delete-button {
  opacity: 1;
}

.delete-button:hover {
  color: #ff4d4f;
  background: rgba(255, 77, 79, 0.1);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
  padding: 40px 20px;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

.sidebar-bottom {
  padding: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.settings-button {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  font-size: 14px;
}

.settings-button:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: #fff;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .chat-sidebar {
    width: 100%;
    max-width: 280px;
    position: fixed;
    left: -280px;
    top: 0;
    z-index: 1000;
    transition: left 0.3s ease;
  }

  .chat-sidebar.mobile-open {
    left: 0;
  }
}
</style>
