<template>
  <div class="progress-container" v-if="isLoading || progress.percentage > 0">
    <div class="progress-header">
      <h3 class="progress-title">{{ t('loading.analyzeClaim') }}</h3>
      <div class="progress-percentage">{{ Math.round(progress.percentage) }}%</div>
    </div>
    
    <div class="progress-bar-container">
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: `${progress.percentage}%` }"
        ></div>
      </div>
    </div>
    
    <div class="current-step" v-if="progress.currentStep">
      <div class="step-icon">{{ getStepIcon(getCurrentStepType()) }}</div>
      <div class="step-text">{{ progress.currentStep }}</div>
    </div>
    
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
    
    <div class="steps-summary" v-if="progress.expectedSteps > 0 && mode !== 'define'">
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
    
    <!-- Detailed steps for debugging/transparency -->
    <div class="steps-detail" v-if="showDetails && progress.steps.length > 0 && mode !== 'define'">
      <div class="steps-list">
        <div 
          v-for="step in progress.steps" 
          :key="step.step_type || step.step_number"
          class="step-item"
          :class="{ 
            'completed': step.status === 'completed',
            'failed': step.status === 'failed',
            'in-progress': step.status === 'in_progress'
          }"
        >
          <div class="step-icon-small">{{ getStepIcon(step.step_type) }}</div>
          <div class="step-content">
            <div class="step-name">{{ getStepName(step.step_type) }}</div>
            <div class="step-description">{{ step.summary }}</div>
            <div class="step-status">{{ step.status }}</div>
            <div class="step-timestamp" v-if="step.timestamp">
              {{ formatTimestamp(step.timestamp) }}
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <button 
      v-if="progress.steps.length > 0 && mode !== 'define'" 
      @click="showDetails = !showDetails"
      class="toggle-details"
    >
      {{ showDetails ? 'Hide' : 'Show' }} Details
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  isLoading: Boolean,
  progress: Object,
  isConnected: Boolean,
  usePolling: Boolean,
  mode: {
    type: String,
    default: 'fact_check'
  }
})

const showDetails = ref(false)

// Step icons and names mapping
const stepIcons = {
  'initial_web_search': '🔍',
  'deeper_exploration': '🔬',
  'source_credibility_evaluation': '⚖️',
  'final_conclusion': '📋',
  'submitting': '📤',
  'analyzing': '🧠',
  'definition': '🧠',
  'define_term': '🧠'
}

const stepNames = {
  'initial_web_search': 'Initial Search',
  'deeper_exploration': 'Deeper Exploration',
  'source_credibility_evaluation': 'Source Evaluation',
  'final_conclusion': 'Final Conclusion',
  'submitting': 'Submitting Request',
  'analyzing': 'Analyzing Content',
  'definition': 'Generating Definition',
  'define_term': 'Generating Definition'
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

const getCurrentStepType = () => {
  if (!props.progress.steps || props.progress.steps.length === 0) return 'analyzing'
  
  const currentStep = props.progress.steps.find(step => step.status === 'in_progress')
  return currentStep ? currentStep.step_type : 'analyzing'
}

const getStepName = (stepType) => {
  return stepNames[stepType] || stepType
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

.progress-percentage {
  font-size: 18px;
  font-weight: 600;
  color: #000000;
}

.progress-bar-container {
  margin-bottom: 16px;
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

.current-step {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 12px;
}

.step-icon {
  font-size: 20px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.step-text {
  font-size: 14px;
  color: #555555;
  line-height: 1.4;
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

.analysis-phase {
  margin-top: 4px;
  color: #1890ff;
  font-size: 11px;
}

.step-icon-small {
  font-size: 14px;
  margin-top: 2px;
  flex-shrink: 0;
}

.step-name {
  font-weight: 600;
  color: #333;
  font-size: 12px;
  margin-bottom: 2px;
}

.step-description {
  font-size: 11px;
  color: #666;
  line-height: 1.3;
  margin-bottom: 2px;
}

.step-timestamp {
  font-size: 10px;
  color: #999;
  margin-top: 2px;
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

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.step-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
}

.step-item:last-child {
  border-bottom: none;
}

.step-number {
  background: #f0f0f0;
  color: #666666;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.step-item.completed .step-number {
  background: #52c41a;
  color: white;
}

.step-item.failed .step-number {
  background: #f5222d;
  color: white;
}

.step-item.in-progress .step-number {
  background: #1890ff;
  color: white;
  animation: pulse 1.5s infinite;
}

.step-content {
  flex: 1;
}

.step-description {
  font-size: 12px;
  color: #333333;
  line-height: 1.3;
  margin-bottom: 2px;
}

.step-status {
  font-size: 10px;
  color: #999999;
  text-transform: uppercase;
  font-weight: 500;
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
  
  .step-text {
    font-size: 13px;
  }
}
</style>
