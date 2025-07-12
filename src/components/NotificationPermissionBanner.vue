<template>
  <div class="notification-banner" v-if="showBanner">
    <div class="banner-content">
      <div class="banner-icon">🔔</div>
      <div class="banner-text">
        <div class="banner-title">Stay Updated</div>
        <div class="banner-description">
          Get notified when your {{ mode === 'research' ? 'research' : 'fact-check' }} completes, even if you close the page.
        </div>
      </div>
      <div class="banner-actions">
        <a-button type="primary" size="small" @click="handleEnable">
          Enable Notifications
        </a-button>
        <a-button size="small" @click="handleDismiss">
          Not Now
        </a-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Button } from 'ant-design-vue'
import { notification } from 'ant-design-vue'
import sessionPersistenceService from '../services/sessionPersistenceService'

const props = defineProps({
  mode: {
    type: String,
    default: 'fact_check'
  },
  isLoading: Boolean
})

const showBanner = ref(false)
const dismissed = ref(false)

const shouldShowBanner = computed(() => {
  return showBanner.value && 
         !dismissed.value && 
         props.isLoading && 
         !sessionPersistenceService.notificationPermission &&
         'Notification' in window
})

const handleEnable = async () => {
  try {
    const granted = await sessionPersistenceService.requestNotificationPermission()
    
    if (granted) {
      notification.success({
        message: 'Notifications Enabled',
        description: 'You\'ll be notified when your analysis completes.',
        duration: 3
      })
    } else {
      notification.warning({
        message: 'Notifications Blocked',
        description: 'You can enable notifications in your browser settings.',
        duration: 5
      })
    }
    
    showBanner.value = false
  } catch (error) {
    console.error('Failed to enable notifications:', error)
    notification.error({
      message: 'Notification Setup Failed',
      description: 'Could not set up notifications. Please try again.',
      duration: 3
    })
  }
}

const handleDismiss = () => {
  dismissed.value = true
  showBanner.value = false
}

onMounted(() => {
  // Show banner after a short delay if conditions are met
  setTimeout(() => {
    if (shouldShowBanner.value) {
      showBanner.value = true
    }
  }, 3000) // Show after 3 seconds of analysis starting
})

// Watch for loading changes to show banner
const unwatchLoading = computed(() => {
  if (props.isLoading && !sessionPersistenceService.notificationPermission && 'Notification' in window) {
    setTimeout(() => {
      if (!dismissed.value) {
        showBanner.value = true
      }
    }, 3000)
  }
})
</script>

<style scoped>
.notification-banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 12px 20px;
  margin: 16px 0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.banner-icon {
  font-size: 24px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.banner-text {
  flex: 1;
}

.banner-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 2px;
}

.banner-description {
  font-size: 12px;
  opacity: 0.9;
  line-height: 1.3;
}

.banner-actions {
  display: flex;
  gap: 8px;
}

.banner-actions .ant-btn {
  border: none;
  box-shadow: none;
}

.banner-actions .ant-btn-primary {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.banner-actions .ant-btn-primary:hover {
  background: rgba(255, 255, 255, 0.3);
}

.banner-actions .ant-btn:not(.ant-btn-primary) {
  background: transparent;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.banner-actions .ant-btn:not(.ant-btn-primary):hover {
  background: rgba(255, 255, 255, 0.1);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .notification-banner {
    padding: 12px 16px;
    margin: 12px 0;
  }

  .banner-content {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .banner-icon {
    align-self: center;
  }

  .banner-text {
    text-align: center;
  }

  .banner-actions {
    justify-content: center;
  }

  .banner-actions .ant-btn {
    flex: 1;
  }
}
</style>
