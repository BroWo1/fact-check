<template>
  <Transition name="modal" appear>
    <div v-if="visible" class="settings-modal-overlay" @click="handleOverlayClick">
      <div class="settings-modal" @click.stop>
        <div class="settings-modal-header">
          <h3 class="settings-modal-title">{{$t('settings.title')}}</h3>
          <button class="close-button" @click="closeModal">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M12 4l-8 8m0-8l8 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"
                stroke-linejoin="round" />
            </svg>
          </button>
        </div>

        <div class="settings-modal-content">
          <div class="settings-section">
            <h4 class="section-title">{{$t('settings.weeklyActivity')}}</h4>
            
            <div class="stats-grid">
              <div class="stat-item">
                <div class="stat-label">{{$t('settings.advancedRequests')}}</div>
                <div class="stat-value">{{ weeklyStats.analyses }}</div>
                <div class="stat-description">{{$t('settings.thisWeek')}}</div>
              </div>
              
              <div class="stat-item">
                <div class="stat-label">{{$t('settings.quickRequests')}}</div>
                <div class="stat-value">{{ weeklyStats.interactions }}</div>
                <div class="stat-description">{{$t('settings.thisWeek')}}</div>
              </div>
            </div>
          </div>

          <div class="settings-section">
            <h4 class="section-title">{{$t('settings.preferences')}}</h4>
            
            <div class="setting-item">
              <div class="setting-info">
                <label class="setting-label">{{$t('settings.language')}}</label>
                <div class="setting-description">{{$t('settings.languageDescription')}}</div>
              </div>
              <div class="setting-control">
                <LanguageSelector />
              </div>
            </div>
            
            <div class="setting-item">
              <div class="setting-info">
                <label class="setting-label">{{$t('settings.maxMode')}}</label>
                <div class="setting-description">{{$t('settings.maxModeDescription')}}</div>
              </div>
              <div class="setting-control">
                <button 
                  class="toggle-switch" 
                  :class="{ 'active': maxMode }"
                  @click="toggleMaxMode"
                >
                  <span class="toggle-slider"></span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useSavedAnalyses } from '../composables/useSavedAnalyses'
import { usePPTGenerations } from '../composables/usePPTGenerations'
import LanguageSelector from './LanguageSelector.vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const maxMode = ref(false)
const { savedAnalyses } = useSavedAnalyses()
const { getWeeklyPPTGenerations } = usePPTGenerations()

// Load max mode setting from localStorage on mount
onMounted(() => {
  try {
    const saved = localStorage.getItem('settings-max-mode')
    if (saved !== null) {
      maxMode.value = JSON.parse(saved)
    }
  } catch (error) {
    console.warn('Failed to load max mode setting:', error)
  }
})

// Watch for changes and save to localStorage
watch(maxMode, (newValue) => {
  try {
    localStorage.setItem('settings-max-mode', JSON.stringify(newValue))
  } catch (error) {
    console.warn('Failed to save max mode setting:', error)
  }
})

// Toggle max mode function
const toggleMaxMode = () => {
  maxMode.value = !maxMode.value
  // For now, just console log the change - no actual functionality
  console.log('Max mode toggled:', maxMode.value ? 'enabled' : 'disabled')
}

// Calculate weekly stats
const weeklyStats = computed(() => {
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  
  const weeklyAnalyses = savedAnalyses.value.filter(analysis => {
    try {
      const analysisDate = new Date(analysis.timestamp)
      return !isNaN(analysisDate.getTime()) && analysisDate >= oneWeekAgo
    } catch (error) {
      console.warn('Invalid timestamp format:', analysis.timestamp, error)
      return false
    }
  })
  
  // Get weekly PPT generations count
  const weeklyPPTCount = getWeeklyPPTGenerations.value
  
  // Advanced requests = analyses + PPT generations
  const advancedRequests = weeklyAnalyses.length + weeklyPPTCount
  
  // For now, we'll estimate interactions as 2x analyses (section edits + AI asks)
  // In the future, this could be tracked more precisely
  const estimatedInteractions = weeklyAnalyses.length * 2
  
  return {
    analyses: advancedRequests,
    interactions: estimatedInteractions
  }
})

const handleOverlayClick = (event) => {
  if (event.target === event.currentTarget) {
    closeModal()
  }
}

const closeModal = () => {
  emit('close')
}
</script>

<style scoped>
@font-face {
  font-family: 'LXGW Neo ZhiSong Plus';
  src: url('../assets/fonts/LXGWNeoZhiSongPlus.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}

.settings-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: overlayFadeIn 0.3s ease-out;
}

@keyframes overlayFadeIn {
  from {
    opacity: 0;
    backdrop-filter: blur(0px);
  }
  to {
    opacity: 1;
    backdrop-filter: blur(8px);
  }
}

/* Modal transition animations - similar to Ant Design Modal */
.modal-enter-active {
  transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
}

.modal-leave-active {
  transition: all 0.2s cubic-bezier(0.755, 0.05, 0.855, 0.06);
}

.modal-enter-from {
  opacity: 0;
}

.modal-enter-to {
  opacity: 1;
}

.modal-leave-from {
  opacity: 1;
}

.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .settings-modal {
  transform: translate(-50%, -50%) scale(0.5);
  opacity: 0;
}

.modal-enter-to .settings-modal {
  transform: translate(-50%, -50%) scale(1);
  opacity: 1;
}

.modal-leave-from .settings-modal {
  transform: translate(-50%, -50%) scale(1);
  opacity: 1;
}

.modal-leave-to .settings-modal {
  transform: translate(-50%, -50%) scale(0.5);
  opacity: 0;
}

.settings-modal {
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  width: 480px;
  max-width: 90vw;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
}

.settings-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e9ecef;
  background: #fafafa;
}

.settings-modal-title {
  font-family: 'Playfair Display', 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 16px;
  font-weight: 600;
  color: #000000;
  margin: 0;
}

.close-button {
  background: transparent;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #999999;
  border-radius: 6px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
}

.close-button:hover {
  background: rgba(0, 0, 0, 0.04);
  color: #000000;
}

.settings-modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  font-family: 'Playfair Display', 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 14px;
  font-weight: 600;
  color: #000000;
  margin: 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #e9ecef;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.stat-item {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 14px;
  text-align: center;
  transition: all 0.2s ease;
}

.stat-item:hover {
  background: #f0f0f0;
}

.stat-label {
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 12px;
  font-weight: 600;
  color: #666666;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-family: 'Playfair Display', 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 24px;
  font-weight: 600;
  color: #000000;
  margin-bottom: 4px;
  line-height: 1;
}

.stat-description {
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 11px;
  color: #999999;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.setting-item:hover {
  background: #f0f0f0;
}

.setting-info {
  flex: 1;
}

.setting-label {
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 13px;
  font-weight: 600;
  color: #000000;
  display: block;
  margin-bottom: 4px;
}

.setting-description {
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 11px;
  color: #666666;
  line-height: 1.4;
}

.setting-control {
  margin-left: 16px;
}

.toggle-switch {
  position: relative;
  width: 44px;
  height: 22px;
  background: #e9ecef;
  border: none;
  border-radius: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
}


.toggle-switch.active {
  background: #1890ff;
}

.toggle-slider {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  background: #ffffff;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.toggle-switch.active .toggle-slider {
  transform: translateX(22px);
}

@media (max-width: 768px) {
  .settings-modal {
    width: 95vw;
    max-height: 85vh;
  }

  .settings-modal-header {
    padding: 12px 16px;
  }

  .settings-modal-title {
    font-size: 15px;
  }

  .close-button {
    width: 24px;
    height: 24px;
    padding: 6px;
  }

  .settings-modal-content {
    padding: 16px;
    gap: 16px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .stat-item {
    padding: 12px;
  }

  .stat-value {
    font-size: 20px;
  }

  .setting-item {
    padding: 12px;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .setting-control {
    margin-left: 0;
    align-self: flex-end;
  }
}

/* Smooth scrollbar styling to match other components */
.settings-modal-content::-webkit-scrollbar {
  width: 4px;
}

.settings-modal-content::-webkit-scrollbar-track {
  background: #f8f9fa;
}

.settings-modal-content::-webkit-scrollbar-thumb {
  background: #e9ecef;
  border-radius: 2px;
}

.settings-modal-content::-webkit-scrollbar-thumb:hover {
  background: #d0d0d0;
}

/* Focus visible styles for accessibility */
.close-button:focus-visible,
.toggle-switch:focus-visible {
  outline: 2px solid #1890ff;
  outline-offset: 2px;
}
</style>