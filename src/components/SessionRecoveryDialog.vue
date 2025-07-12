<template>
  <a-modal
    v-model:open="showDialog"
    title="Recover Previous Sessions"
    width="600px"
    :footer="null"
    :mask-closable="false"
    :destroy-on-close="true"
  >
    <div class="recovery-dialog">
      <div class="dialog-header">
        <h4>We found analysis sessions that were running when you left:</h4>
        <p class="dialog-subtitle">Would you like to continue where you left off?</p>
      </div>

      <div class="sessions-list">
        <div 
          v-for="session in formattedSessions" 
          :key="session.sessionId"
          class="session-item"
        >
          <div class="session-content">
            <div class="session-header">
              <span class="session-mode">{{ session.modeLabel }}</span>
              <span class="session-time">{{ session.timeAgo }}</span>
            </div>
            
            <div class="session-claim">
              {{ session.displayClaim }}
            </div>
            
            <div class="session-progress">
              <div class="progress-bar">
                <div 
                  class="progress-fill" 
                  :style="{ width: `${session.progress?.percentage || 0}%` }"
                ></div>
              </div>
              <span class="progress-text">{{ session.progressText }} complete</span>
            </div>
            
            <div class="session-step" v-if="session.progress?.currentStep">
              <span class="step-label">Last step:</span>
              {{ session.progress.currentStep }}
            </div>
          </div>

          <div class="session-actions">
            <a-button 
              type="primary" 
              size="small" 
              :loading="isRecovering && recoveringSessionId === session.sessionId"
              @click="handleRecover(session.sessionId)"
            >
              <template #icon>
                <PlayCircleOutlined />
              </template>
              Continue
            </a-button>
            
            <a-button 
              size="small" 
              :disabled="isRecovering"
              @click="handleDismiss(session.sessionId)"
            >
              <template #icon>
                <CloseOutlined />
              </template>
              Dismiss
            </a-button>
          </div>
        </div>
      </div>

      <div class="dialog-footer">
        <a-space>
          <a-button 
            :disabled="isRecovering"
            @click="handleDismissAll"
          >
            Dismiss All
          </a-button>
          
          <a-button 
            type="primary" 
            ghost
            :disabled="isRecovering"
            @click="handleClose"
          >
            Close
          </a-button>
        </a-space>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { computed, ref } from 'vue'
import { PlayCircleOutlined, CloseOutlined } from '@ant-design/icons-vue'

const props = defineProps({
  visible: Boolean,
  sessions: Array,
  isRecovering: Boolean
})

const emit = defineEmits(['recover', 'dismiss', 'dismissAll', 'close'])

const recoveringSessionId = ref(null)

const showDialog = computed({
  get: () => props.visible,
  set: (value) => {
    if (!value) {
      emit('close')
    }
  }
})

const formattedSessions = computed(() => {
  return props.sessions.map(session => {
    const timeAgo = getTimeAgo(new Date(session.lastUpdate))
    const shortClaim = session.originalClaim.length > 80 
      ? `${session.originalClaim.substring(0, 80)}...` 
      : session.originalClaim
    
    return {
      ...session,
      displayClaim: shortClaim,
      timeAgo,
      modeLabel: session.mode === 'research' ? 'Research' : 'Fact-Check',
      progressText: `${Math.round(session.progress?.percentage || 0)}%`
    }
  })
})

const getTimeAgo = (date) => {
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)

  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  } else {
    return 'Just now'
  }
}

const handleRecover = (sessionId) => {
  recoveringSessionId.value = sessionId
  emit('recover', sessionId)
}

const handleDismiss = (sessionId) => {
  emit('dismiss', sessionId)
}

const handleDismissAll = () => {
  emit('dismissAll')
}

const handleClose = () => {
  emit('close')
}
</script>

<style scoped>
.recovery-dialog {
  font-family: 'Crimson Text', serif;
}

.dialog-header {
  margin-bottom: 20px;
  text-align: center;
}

.dialog-header h4 {
  font-family: 'Playfair Display', serif;
  font-size: 18px;
  color: #000000;
  margin: 0 0 8px 0;
}

.dialog-subtitle {
  color: #666666;
  margin: 0;
  font-size: 14px;
}

.sessions-list {
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 20px;
}

.session-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  margin-bottom: 12px;
  background: #fafafa;
}

.session-item:last-child {
  margin-bottom: 0;
}

.session-content {
  flex: 1;
  margin-right: 16px;
}

.session-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.session-mode {
  background: #000000;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.session-time {
  color: #999999;
  font-size: 12px;
}

.session-claim {
  font-size: 14px;
  color: #333333;
  margin-bottom: 8px;
  line-height: 1.4;
}

.session-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: #e9ecef;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #000000, #333333);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 11px;
  color: #666666;
  white-space: nowrap;
}

.session-step {
  font-size: 12px;
  color: #555555;
}

.step-label {
  font-weight: 600;
  color: #333333;
}

.session-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dialog-footer {
  text-align: center;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .session-item {
    flex-direction: column;
    align-items: stretch;
  }

  .session-content {
    margin-right: 0;
    margin-bottom: 12px;
  }

  .session-actions {
    flex-direction: row;
    justify-content: stretch;
  }

  .session-actions .ant-btn {
    flex: 1;
  }
}
</style>
