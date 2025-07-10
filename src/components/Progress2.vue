<template>
  <div class="progress-container" v-if="isLoading || progress.percentage > 0">
    <div class="progress-header">
      <h3 class="progress-title">Analyzing Your Claim</h3>
      <div class="progress-info">
        <div class="progress-percentage">{{ Math.round(progress.percentage) }}%</div>
        <div class="analysis-timer" v-if="analysisStartTime">
          {{ formatElapsedTime(elapsedTime) }}
        </div>
      </div>
    </div>
    
    <div class="progress-bar-container">
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: `${progress.percentage}%` }"
        ></div>
      </div>
    </div>
    
    <!-- Main Steps Display -->
    <div class="steps-container">
      <a-steps 
        :current="getCurrentStepIndex()" 
        :status="getStepsStatus()"
        size="small"
        :direction="isMobile ? 'vertical' : 'horizontal'"
      >
        <a-step 
          v-for="(step, index) in getMainSteps()" 
          :key="step.key"
          :title="step.title"
          :description="step.description"
          :status="step.status"
        >
          <template #icon>
            <span class="step-icon-emoji">{{ step.icon }}</span>
          </template>
        </a-step>
      </a-steps>
    </div>
    <!--
    <div class="connection-status" v-if="usePolling && !isConnected">
      <div class="status-indicator polling"></div>
      <span class="status-text">Using status polling (WebSocket unavailable)</span>
    </div>
    
    <div class="connection-status" v-else-if="isConnected">
      <div class="status-indicator online"></div>
      <span class="status-text">Real-time updates connected</span>
    </div>
    
    <div class="connection-status" v-else-if="isLoading">
      <div class="status-indicator connecting"></div>
      <span class="status-text">Connecting to live updates...</span>
    </div>

    -->
    
    <div class="steps-summary" v-if="progress.expectedSteps > 0">
      <div class="steps-count">
        Step {{ progress.stepNumber || progress.completedSteps + 1 }} of {{ progress.expectedSteps }}
        <span v-if="progress.completedSteps > 0">
          ({{ progress.completedSteps }} completed)
        </span>
      </div>
      <div class="analysis-phase" v-if="getCurrentPhase()">
        <strong>{{ getCurrentPhase() }}</strong>
      </div>
    </div>
    
    <!-- Detailed Steps Toggle -->
    <button 
      v-if="progress.steps.length > 0" 
      @click="showDetails = !showDetails"
      class="toggle-details"
    >
      {{ showDetails ? 'Hide' : 'Show' }} Details
    </button>
    
    <!-- Detailed Steps Display -->
    <div class="steps-detail" v-if="showDetails && progress.steps.length > 0">
      <a-steps 
        :current="getCurrentDetailStepIndex()" 
        direction="vertical"
        size="small"
        :status="getDetailStepsStatus()"
      >
        <a-step 
          v-for="(step, index) in progress.steps" 
          :key="step.step_type || step.step_number || index"
          :title="getStepName(step.step_type)"
          :description="getStepDescription(step)"
          :status="mapStepStatus(step.status)"
        >
          <template #icon>
            <span class="step-icon-custom">{{ getStepIcon(step.step_type) }}</span>
          </template>
        </a-step>
      </a-steps>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  isLoading: Boolean,
  progress: Object,
  isConnected: Boolean,
  usePolling: Boolean
})

const showDetails = ref(false)
const isMobile = ref(false)

// Timer related variables
const analysisStartTime = ref(null)
const elapsedTime = ref(0)
const timerInterval = ref(null)

// Step icons and names mapping
const stepIcons = {
  'initial_web_search': '🔍',
  'deeper_exploration': '🔬',
  'source_credibility_evaluation': '⚖️',
  'final_conclusion': '📋',
  'submitting': '📤',
  'analyzing': '🧠'
}

const stepNames = {
  'initial_web_search': 'Initial Search',
  'deeper_exploration': 'Deeper Exploration',
  'source_credibility_evaluation': 'Source Evaluation',
  'final_conclusion': 'Final Conclusion',
  'submitting': 'Submitting Request',
  'analyzing': 'Analyzing Content'
}

// Check if mobile for responsive steps
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }
})

// Watch for analysis start/stop
watch(() => props.isLoading, (newVal, oldVal) => {
  if (newVal && !oldVal) {
    // Analysis started
    startTimer()
  } else if (!newVal && oldVal) {
    // Analysis stopped
    stopTimer()
  }
}, { immediate: true })

// Timer functions
const startTimer = () => {
  analysisStartTime.value = Date.now()
  elapsedTime.value = 0
  
  timerInterval.value = setInterval(() => {
    if (analysisStartTime.value) {
      elapsedTime.value = Date.now() - analysisStartTime.value
    }
  }, 1000)
}

const stopTimer = () => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
}

const formatElapsedTime = (ms) => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (minutes > 0) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  } else {
    return `${remainingSeconds}s`
  }
}

// Get main steps for horizontal display
const getMainSteps = () => {
  const mainStepTypes = ['initial_web_search', 'deeper_exploration', 'source_credibility_evaluation', 'final_conclusion']
  
  return mainStepTypes.map(stepType => {
    const step = props.progress.steps?.find(s => s.step_type === stepType)
    return {
      key: stepType,
      title: stepNames[stepType],
      description: step?.summary || '',
      icon: stepIcons[stepType],
      status: step ? mapStepStatus(step.status) : 'wait'
    }
  })
}

const getCurrentStepIndex = () => {
  if (!props.progress.steps || props.progress.steps.length === 0) return 0
  
  const mainStepTypes = ['initial_web_search', 'deeper_exploration', 'source_credibility_evaluation', 'final_conclusion']
  const currentStep = props.progress.steps.find(step => step.status === 'in_progress')
  
  if (currentStep) {
    const index = mainStepTypes.indexOf(currentStep.step_type)
    return index >= 0 ? index : 0
  }
  
  // Return the last completed step index
  const completedSteps = props.progress.steps.filter(step => step.status === 'completed')
  const lastCompleted = completedSteps[completedSteps.length - 1]
  
  if (lastCompleted) {
    const index = mainStepTypes.indexOf(lastCompleted.step_type)
    return index >= 0 ? index + 1 : 0
  }
  
  return 0
}

const getStepsStatus = () => {
  const hasError = props.progress.steps?.some(step => step.status === 'failed')
  return hasError ? 'error' : 'process'
}

const getCurrentDetailStepIndex = () => {
  if (!props.progress.steps || props.progress.steps.length === 0) return 0
  
  const currentStepIndex = props.progress.steps.findIndex(step => step.status === 'in_progress')
  return currentStepIndex >= 0 ? currentStepIndex : props.progress.steps.length
}

const getDetailStepsStatus = () => {
  const hasError = props.progress.steps?.some(step => step.status === 'failed')
  return hasError ? 'error' : 'process'
}

const mapStepStatus = (status) => {
  switch (status) {
    case 'completed': return 'finish'
    case 'failed': return 'error'
    case 'in_progress': return 'process'
    default: return 'wait'
  }
}

const getCurrentPhase = () => {
  if (!props.progress.steps || props.progress.steps.length === 0) return null
  
  const currentStep = props.progress.steps.find(step => step.status === 'in_progress')
  if (currentStep) {
    return stepNames[currentStep.step_type] || currentStep.step_type
  }
  
  return null
}

const getStepIcon = (stepType) => {
  return stepIcons[stepType] || '⏳'
}

const getStepName = (stepType) => {
  return stepNames[stepType] || stepType
}

const getStepDescription = (step) => {
  let description = step.summary || ''
  if (step.timestamp) {
    const time = formatTimestamp(step.timestamp)
    description += description ? ` • ${time}` : time
  }
  return description
}

const formatTimestamp = (timestamp) => {
  try {
    return new Date(timestamp).toLocaleTimeString()
  } catch (e) {
    return timestamp
  }
}
</script>

<style scoped>
.progress-container {
  background: #fafafa;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  padding: 24px;
  margin: 20px 0;
  font-family: 'Crimson Text', serif;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.progress-title {
  font-family: 'Playfair Display', serif;
  font-size: 20px;
  font-weight: 600;
  color: #000000;
  margin: 0;
}

.progress-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.progress-percentage {
  font-size: 18px;
  font-weight: 600;
  color: #000000;
}

.analysis-timer {
  font-size: 14px;
  font-weight: 500;
  color: #666666;
  font-family: 'Crimson Text', serif;
}

.progress-bar-container {
  margin-bottom: 20px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #000000, #333333);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.steps-container {
  margin-bottom: 20px;
}

/* Custom styling for a-steps */
:deep(.ant-steps-item-title) {
  font-family: 'Crimson Text', serif !important;
  font-size: 14px !important;
  color: #333333 !important;
}

:deep(.ant-steps-item-description) {
  font-family: 'Crimson Text', serif !important;
  font-size: 12px !important;
  color: #666666 !important;
}

/* Remove background colors and borders for emoji icons */
:deep(.ant-steps-item-icon) {
  background-color: transparent !important;
  border: none !important;
  width: auto !important;
  height: auto !important;
  line-height: 1 !important;
}

:deep(.ant-steps-item-process .ant-steps-item-icon) {
  background-color: transparent !important;
  border: none !important;
}

:deep(.ant-steps-item-finish .ant-steps-item-icon) {
  background-color: transparent !important;
  border: none !important;
}

:deep(.ant-steps-item-error .ant-steps-item-icon) {
  background-color: transparent !important;
  border: none !important;
}

:deep(.ant-steps-item-wait .ant-steps-item-icon) {
  background-color: transparent !important;
  border: none !important;
}

.step-icon-emoji {
  font-size: 18px;
  display: inline-block;
}

.step-icon-custom {
  font-size: 16px;
}

/* Animate current step emoji */
:deep(.ant-steps-item-process) .step-icon-emoji {
  animation: pulse 2s infinite;
}

/* Animate detailed steps in progress */
:deep(.ant-steps-item-process) .step-icon-custom {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #666666;
  margin-bottom: 12px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-indicator.online {
  background: #52c41a;
  animation: blink 1.5s infinite;
}

.status-indicator.polling {
  background: #1890ff;
  animation: pulse 1.5s infinite;
}

.status-indicator.connecting {
  background: #faad14;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.status-text {
  font-size: 11px;
}

.steps-summary {
  font-size: 12px;
  color: #666666;
  margin-bottom: 12px;
}

.steps-count {
  font-weight: 500;
}

.analysis-phase {
  margin-top: 4px;
  color: #1890ff;
  font-size: 11px;
}

.toggle-details {
  background: none;
  border: 1px solid #d9d9d9;
  color: #666666;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Crimson Text', serif;
  margin-bottom: 16px;
}

.toggle-details:hover {
  border-color: #000000;
  color: #000000;
}

.steps-detail {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

@media (max-width: 768px) {
  .progress-container {
    padding: 16px;
  }
  
  .progress-title {
    font-size: 18px;
  }
  
  .progress-percentage {
    font-size: 16px;
  }
  
  .analysis-timer {
    font-size: 12px;
  }
  
  .progress-info {
    align-items: flex-end;
  }
  
  :deep(.ant-steps-item-title) {
    font-size: 13px !important;
  }
  
  :deep(.ant-steps-item-description) {
    font-size: 11px !important;
  }
}
</style>