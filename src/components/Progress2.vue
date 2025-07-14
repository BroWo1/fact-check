<template>
  <div class="progress-container" v-if="isLoading || progress.percentage > 0 || hasResults">
    <div class="progress-header" @click="toggleCollapsed" :class="{ 'clickable': !isLoading, 'collapsed': isCollapsed }">
      <h3 class="progress-title">{{ getProgressTitle() }}</h3>
      <div class="progress-info">
        <div class="progress-percentage">{{ getDisplayPercentage() }}%</div>
        <div class="analysis-timer" v-if="analysisStartTime">
          {{ formatElapsedTime(elapsedTime) }}
        </div>
        <div class="collapse-indicator" v-if="!isLoading" :class="{ 'collapsed': isCollapsed }">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
    
    <!-- Collapsible Content -->
    <div class="progress-content" :class="{ 'collapsed': isCollapsed }">
      <div class="progress-inner">
        <div class="progress-bar-container">
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: `${getDisplayPercentage()}%` }"
            ></div>
          </div>
        </div>
        
        <!-- Main Steps Display -->
        <div class="steps-container">
          <a-steps 
            :current="getCurrentStepIndex" 
            :status="getStepsStatus"
            size="small"
            :direction="isMobile ? 'vertical' : 'horizontal'"
          >
            <a-step 
              v-for="(step, index) in getMainSteps" 
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
        
        <div class="steps-summary" v-if="(progress?.expectedSteps > 0) || hasResults">
          <div class="steps-count" v-if="progress?.expectedSteps > 0">
            {{ t('progress.ui.stepOf', { 
              current: progress.stepNumber || progress.completedSteps + 1, 
              total: progress.expectedSteps 
            }) }}
            <span v-if="progress.completedSteps > 0">
              ({{ progress.completedSteps }} {{ t('progress.ui.completed') }})
            </span>
          </div>
          <div class="steps-count" v-else-if="hasResults && !isLoading">
            {{ t('progress.ui.analysisComplete') }}
          </div>
          <div class="analysis-phase" v-if="getCurrentPhase">
            <strong>{{ getCurrentPhase }}</strong>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  isLoading: Boolean,
  progress: Object,
  isConnected: Boolean,
  usePolling: Boolean,
  mode: {
    type: String,
    default: 'fact_check'
  },
  initialCollapsed: {
    type: Boolean,
    default: true  // Default to collapsed for auto-hide behavior
  },
  hasResults: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:collapsed'])

const showDetails = ref(false)
const isMobile = ref(false)
const isCollapsed = ref(props.initialCollapsed)

// Timer related variables
const analysisStartTime = ref(null)
const elapsedTime = ref(0)
const timerInterval = ref(null)

// Step icons and names mapping
const stepIcons = {
  // Fact-check steps
  'initial_web_search': '🔍',
  'deeper_exploration': '🔬',
  'source_credibility_evaluation': '⚖️',
  'final_conclusion': '📋',
  'submitting': '📤',
  'analyzing': '🧠',
  
  // Research steps (actual backend step types)
  'research_understanding': '🎯',
  'general_research': '📚',
  'specific_research': '🔍',
  
  // Legacy research steps (keep for compatibility)
  'topic_analysis': '📊',
  'research_gathering': '📚',
  'source_analysis': '🔍',
  'synthesis': '🧩',
  'report_generation': '📄'
}

const stepNames = {
  // Fact-check steps
  'initial_web_search': () => t('progress.steps.initial_web_search'),
  'deeper_exploration': () => t('progress.steps.deeper_exploration'),
  'source_credibility_evaluation': () => t('progress.steps.source_credibility_evaluation'),
  'final_conclusion': () => t('progress.steps.final_conclusion'),
  'submitting': () => t('progress.steps.submitting'),
  'analyzing': () => t('progress.steps.analyzing'),
  
  // Research steps (actual backend step types)
  'research_understanding': () => t('progress.steps.research_understanding'),
  'general_research': () => t('progress.steps.general_research'),
  'specific_research': () => t('progress.steps.specific_research'),
  
  // Legacy research steps (keep for compatibility)
  'topic_analysis': () => t('progress.steps.topic_analysis'),
  'research_gathering': () => t('progress.steps.research_gathering'),
  'source_analysis': () => t('progress.steps.source_analysis'),
  'synthesis': () => t('progress.steps.synthesis'),
  'report_generation': () => t('progress.steps.report_generation')
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

// Watch for analysis start/stop
watch(() => props.isLoading, (newVal, oldVal) => {
  if (newVal && !oldVal) {
    // Analysis started - expand the view
    isCollapsed.value = false
    startTimer()
  } else if (!newVal && oldVal) {
    // Analysis stopped - only auto-collapse if we don't already have results
    // (prevents overriding saved collapsed state when loading saved analyses)
    stopTimer()
    if (!props.hasResults) {
      setTimeout(() => {
        isCollapsed.value = true
        emit('update:collapsed', true)
      }, 2000) // 2 second delay to let user see final state
    }
  }
}, { immediate: true })

// Watch for hasResults changes
watch(() => props.hasResults, (newVal) => {
  // Handle results state changes if needed
}, { immediate: true })

// Watch for initialCollapsed prop changes
watch(() => props.initialCollapsed, (newVal) => {
  isCollapsed.value = newVal
}, { immediate: true })

// Toggle collapsed state
const toggleCollapsed = () => {
  if (!props.isLoading) {
    isCollapsed.value = !isCollapsed.value
    emit('update:collapsed', isCollapsed.value)
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

// Get progress title based on mode and state
const getProgressTitle = () => {
  // Default titles during analysis
  return props.mode === 'research' 
    ? t('progress.titles.researchingTopic') 
    : t('progress.titles.analyzingClaim')
}

// Get display percentage (100% if results exist but no active progress)
const getDisplayPercentage = () => {
  if (props.progress && props.progress.percentage !== undefined) {
    return Math.round(props.progress.percentage)
  }
  // If we have results (saved analysis) but no active loading, show 100%
  return props.hasResults && !props.isLoading ? 100 : 0
}

// Get main steps for horizontal display
const getMainSteps = computed(() => {
  const mainStepTypes = props.mode === 'research' 
    ? ['research_understanding', 'general_research', 'specific_research']
    : ['initial_web_search', 'deeper_exploration', 'source_credibility_evaluation', 'final_conclusion']
  
  return mainStepTypes.map(stepType => {
    const step = props.progress?.steps?.find(s => s.step_type === stepType)
    
    // If we have results but no active progress (saved analysis), show all steps as completed
    // Also check if this step was saved in progress data
    let status = 'wait'
    let description = ''
    
    if (step) {
      status = mapStepStatus(step.status)
      description = step.summary || step.description || ''
    } else if (props.hasResults && !props.isLoading) {
      // For saved analyses without step details, show all steps as completed
      status = 'finish'
      description = 'Completed'
    }
    
    return {
      key: stepType,
      title: stepNames[stepType] ? stepNames[stepType]() : stepType,
      description: description,
      icon: stepIcons[stepType],
      status: status
    }
  })
})

const getCurrentStepIndex = computed(() => {
  if (!props.progress?.steps || props.progress.steps.length === 0) {
    // If we have results but no progress steps (saved analysis), show all steps completed
    if (props.hasResults && !props.isLoading) {
      const mainStepTypes = props.mode === 'research' 
        ? ['research_understanding', 'general_research', 'specific_research']
        : ['initial_web_search', 'deeper_exploration', 'source_credibility_evaluation', 'final_conclusion']
      return mainStepTypes.length - 1
    }
    return 0
  }
  
  const mainStepTypes = props.mode === 'research' 
    ? ['research_understanding', 'general_research', 'specific_research']
    : ['initial_web_search', 'deeper_exploration', 'source_credibility_evaluation', 'final_conclusion']
  
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
})

const getStepsStatus = computed(() => {
  const hasError = props.progress?.steps?.some(step => step.status === 'failed')
  return hasError ? 'error' : 'process'
})

const getCurrentDetailStepIndex = computed(() => {
  if (!props.progress?.steps || props.progress.steps.length === 0) return 0
  
  const currentStepIndex = props.progress.steps.findIndex(step => step.status === 'in_progress')
  return currentStepIndex >= 0 ? currentStepIndex : props.progress.steps.length
})

const getDetailStepsStatus = computed(() => {
  const hasError = props.progress?.steps?.some(step => step.status === 'failed')
  return hasError ? 'error' : 'process'
})

const mapStepStatus = (status) => {
  switch (status) {
    case 'completed': return 'finish'
    case 'failed': return 'error'
    case 'in_progress': return 'process'
    default: return 'wait'
  }
}

const getCurrentPhase = computed(() => {
  if (!props.progress?.steps || props.progress.steps.length === 0) return null
  
  const currentStep = props.progress.steps.find(step => step.status === 'in_progress')
  if (currentStep) {
    return stepNames[currentStep.step_type] ? stepNames[currentStep.step_type]() : currentStep.step_type
  }
  
  return null
})

const getStepIcon = (stepType) => {
  return stepIcons[stepType] || '⏳'
}

const getStepName = (stepType) => {
  return stepNames[stepType] ? stepNames[stepType]() : stepType
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
  overflow: hidden;
  margin: 20px 0;
  font-family: 'Crimson Text', serif;
  transition: all 0.3s ease-out;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  transition: background-color 0.2s ease-out, padding 0.4s linear, border-bottom-color 0.4s linear;
  border-bottom: 1px solid transparent;
}

.progress-header.collapsed {
  padding: 12px 24px;
  border-bottom-color: transparent;
}

.progress-header.clickable {
  cursor: pointer;
  user-select: none;
}

.progress-header.clickable:hover {
  background: rgba(0, 0, 0, 0.04);
}

.progress-header.clickable:hover .collapse-indicator {
  color: #1890ff;
  transform: scale(1.1);
}

/* --- ANIMATION REFACTOR --- */
/* Use CSS Grid to animate height from 0 to auto for a linear, natural feel. */
/* --- ANIMATION REFACTOR --- */
/* Use CSS Grid to animate height with an ease-in-out curve. */
.progress-content {
  display: grid;
  grid-template-rows: 1fr; /* Expanded state */
  overflow: hidden;
  /* Use faster and simpler transition for a snappier feel */
  transition: grid-template-rows 0.25s ease, border-top-color 0.25s ease;
  border-top: 1px solid #e9ecef;
}

.progress-content.collapsed {
  grid-template-rows: 0fr; /* Collapsed state */
  border-top-color: transparent;
}

.progress-inner {
  padding: 20px 24px;
  min-height: 0; /* Crucial for allowing the grid to collapse the element to zero height */
  /* Animate padding for a faster, smoother visual */
  opacity: 1;
  filter: blur(0);
  transition: padding 0.2s ease, opacity 0.2s ease, filter 0.2s ease;
}

.progress-content.collapsed .progress-inner {
    padding-top: 0;
    padding-bottom: 0;
    opacity: 0;
    filter: blur(4px);
}
/* --- END REFACTOR --- */


.progress-title {
  font-family: 'Playfair Display', serif;
  font-size: 18px;
  font-weight: 600;
  color: #000000;
  margin: 0;
  transition: color 0.3s ease-out;
  line-height: 1.4;
}

.progress-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  min-width: fit-content;
}

.progress-percentage {
  font-size: 16px;
  font-weight: 600;
  color: #000000;
  line-height: 1;
  transition: color 0.2s ease-out;
}

.analysis-timer {
  font-size: 12px;
  font-weight: 500;
  color: #666666;
  font-family: 'Crimson Text', serif;
  line-height: 1;
  transition: opacity 0.2s ease-out;
}

.collapse-indicator {
  color: #999999;
  margin-top: 4px;
  transition: transform 0.3s linear, color 0.2s ease-out, scale 0.2s ease-out;
  display: flex;
  align-items: center;
  justify-content: center;
}

.collapse-indicator.collapsed {
  transform: rotate(-90deg);
}

.progress-bar-container {
  margin-bottom: 20px;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: #e9ecef;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #1890ff, #40a9ff);
  border-radius: 3px;
  transition: width 0.5s ease-out;
}

.steps-container {
  margin-bottom: 20px;
}

/* Custom styling for a-steps */
:deep(.ant-steps-item-title) {
  font-family: 'Crimson Text', serif !important;
  font-size: 14px !important;
  color: #333333 !important;
  transition: color 0.2s ease-out !important;
}

:deep(.ant-steps-item-description) {
  font-family: 'Crimson Text', serif !important;
  font-size: 12px !important;
  color: #666666 !important;
  transition: color 0.2s ease-out !important;
}

/* Remove background colors and borders for emoji icons */
:deep(.ant-steps-item-icon) {
  background-color: transparent !important;
  border: none !important;
  width: auto !important;
  height: auto !important;
  line-height: 1 !important;
  transition: all 0.2s ease-out !important;
}

:deep(.ant-steps-item-process .ant-steps-item-icon),
:deep(.ant-steps-item-finish .ant-steps-item-icon),
:deep(.ant-steps-item-error .ant-steps-item-icon),
:deep(.ant-steps-item-wait .ant-steps-item-icon) {
  background-color: transparent !important;
  border: none !important;
}

.step-icon-emoji {
  font-size: 18px;
  display: inline-block;
  transition: transform 0.2s ease-out, opacity 0.2s ease-out;
}

/* Animate current step emoji */
:deep(.ant-steps-item-process) .step-icon-emoji {
  animation: pulse 2.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { 
    opacity: 1; 
    transform: scale(1);
  }
  50% { 
    opacity: 0.7; 
    transform: scale(1.05);
  }
}

.steps-summary {
  font-size: 12px;
  color: #666666;
}

.steps-count {
  font-weight: 500;
  margin-bottom: 4px;
}

.analysis-phase {
  color: #1890ff;
  font-size: 11px;
}

@media (max-width: 768px) {
  .progress-header {
    padding: 12px 16px;
  }
  
  .progress-header.collapsed {
    padding: 10px 16px;
  }
  
  .progress-inner {
    padding: 16px;
  }
  
  .progress-title {
    font-size: 16px;
  }
  
  .progress-percentage {
    font-size: 14px;
  }
  
  .analysis-timer {
    font-size: 11px;
  }
    
  :deep(.ant-steps-item-title) {
    font-size: 13px !important;
  }
  
  :deep(.ant-steps-item-description) {
    font-size: 11px !important;
  }
  
  .step-icon-emoji {
    font-size: 16px;
  }
}

/* Smooth entry animation for the entire component */
.progress-container {
  animation: slideIn 0.5s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>