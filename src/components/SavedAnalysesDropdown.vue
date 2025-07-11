<template>
  <div class="saved-analyses-dropdown">
    <Button 
      class="dropdown-trigger" 
      @click="toggleDropdown"
      :class="{ 'has-analyses': hasAnalyses }"
    >
      📂 {{ t('savedAnalyses.title') }}
      <span v-if="hasAnalyses" class="analysis-count">({{ savedAnalyses.length }})</span>
      <span class="dropdown-arrow" :class="{ 'open': isOpen }">▼</span>
    </Button>
    
    <transition name="dropdown-fade">
      <div v-if="isOpen" class="dropdown-menu" @click.stop>
        <div class="dropdown-header">
          <h3>{{ t('savedAnalyses.recentAnalyses') }}</h3>
          <Button 
            v-if="hasAnalyses"
            class="clear-all-btn"
            size="small"
            @click="confirmClearAll"
          >
            {{ t('savedAnalyses.clearAll') }}
          </Button>
        </div>
        
        <div v-if="!hasAnalyses" class="empty-state">
          <p>{{ t('savedAnalyses.noAnalyses') }}</p>
        </div>
        
        <div v-else class="analyses-list">
          <div 
            v-for="analysis in recentAnalyses" 
            :key="analysis.id"
            class="analysis-item"
            @click="selectAnalysis(analysis)"
          >
            <div class="analysis-header">
              <div class="verdict-info">
                <span class="mode-badge" :class="analysis.mode || 'fact_check'">
                  {{ (analysis.mode || 'fact_check') === 'fact_check' ? '🔍' : '📚' }}
                </span>
                <span v-if="(analysis.mode || 'fact_check') === 'fact_check' && analysis.verdict" class="verdict-icon">{{ getVerdictIcon(analysis.verdict) }}</span>
                <span v-if="(analysis.mode || 'fact_check') === 'fact_check' && analysis.verdict" class="verdict-text" :style="{ color: getVerdictColor(analysis.verdict) }">
                  {{ t(`verdict.${analysis.verdict}`) || analysis.verdict }}
                </span>
                <span v-if="(analysis.mode || 'fact_check') === 'research'" class="research-indicator">
                  {{ t('mode.research') }}
                </span>
              </div>
              <div class="analysis-date">
                {{ formatAnalysisForDisplay(analysis).displayDate }}
              </div>
            </div>
            
            <div class="analysis-claim">
              {{ formatAnalysisForDisplay(analysis).shortClaim }}
            </div>
            
            <div class="analysis-footer">
              <div class="confidence-info" v-if="(analysis.mode || 'fact_check') === 'fact_check'">
                {{ t('results.confidence') }}: {{ formatAnalysisForDisplay(analysis).confidencePercent }}%
              </div>
              <div class="mode-info" v-else>
                {{ t('research.title') }}
              </div>
              <Button 
                class="delete-btn"
                size="small"
                @click.stop="deleteAnalysis(analysis.id)"
              >
                🗑️
              </Button>
            </div>
          </div>
        </div>
        
        <div v-if="savedAnalyses.length > 10" class="show-more">
          <Button class="show-more-btn" @click="showAllAnalyses">
            {{ t('savedAnalyses.showMore') }} ({{ savedAnalyses.length - 10 }} {{ t('savedAnalyses.more') }})
          </Button>
        </div>
      </div>
    </transition>
    
    <!-- Backdrop -->
    <div 
      v-if="isOpen" 
      class="dropdown-backdrop" 
      @click="closeDropdown"
    ></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Button } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { useSavedAnalyses } from '../composables/useSavedAnalyses'

const { t } = useI18n()
const emit = defineEmits(['select-analysis'])

const {
  savedAnalyses,
  hasAnalyses,
  recentAnalyses,
  deleteAnalysis,
  clearAllAnalyses,
  formatAnalysisForDisplay,
  getVerdictIcon,
  getVerdictColor
} = useSavedAnalyses()

const isOpen = ref(false)

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

const closeDropdown = () => {
  isOpen.value = false
}

const selectAnalysis = (analysis) => {
  emit('select-analysis', analysis)
  closeDropdown()
}

const confirmClearAll = () => {
  if (confirm(t('savedAnalyses.confirmClearAll'))) {
    clearAllAnalyses()
  }
}

const showAllAnalyses = () => {
  // Could implement a full modal view later
  console.log('Show all analyses - feature to be implemented')
}

// Close dropdown when clicking outside
const handleClickOutside = (event) => {
  if (isOpen.value && !event.target.closest('.saved-analyses-dropdown')) {
    closeDropdown()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.saved-analyses-dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-trigger {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 8px 16px;
  font-family: 'Crimson Text', serif;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.dropdown-trigger:hover {
  background: #e9ecef;
  border-color: #dee2e6;
}

.dropdown-trigger.has-analyses {
  background: #e3f2fd;
  border-color: #90caf9;
}

.dropdown-trigger.has-analyses:hover {
  background: #bbdefb;
  border-color: #64b5f6;
}

.analysis-count {
  font-size: 12px;
  color: #1976d2;
  font-weight: 600;
}

.dropdown-arrow {
  font-size: 10px;
  transition: transform 0.2s ease;
  margin-left: auto;
}

.dropdown-arrow.open {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 400px;
  max-width: 500px;
  max-height: 500px;
  overflow-y: auto;
  font-family: 'Crimson Text', serif;
}

.dropdown-header {
  position: sticky;
  top: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
  max-height: 72px;
  z-index: 1001;
}

.dropdown-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333333;
}

.clear-all-btn {
  background: #f0f0f0;
  color: #595959;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  transition: all 0.2s ease;
}

.clear-all-btn:hover {
  background: #e6e6e6;
  border-color: #bfbfbf;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: #666666;
}

.analyses-list {
  padding: 8px 0;
}

.analysis-item {
  padding: 6px 16px;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.analysis-item:hover {
  background: #f8f9fa;
}

.analysis-item:last-child {
  border-bottom: none;
}

.analysis-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 2px;
max-height: 40px;
}

.verdict-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.mode-badge {
  font-size: 14px;
  opacity: 0.8;
}

.mode-badge.fact_check {
  color: #1890ff;
}

.mode-badge.research {
  color: #52c41a;
}

.research-indicator {
  font-family: 'Crimson Text', serif;
  font-size: 12px;
  color: #52c41a;
  font-weight: 600;
}

.mode-info {
  font-family: 'Crimson Text', serif;
  font-size: 12px;
  color: #52c41a;
  font-weight: 600;
}

.verdict-icon {
  font-size: 14px;
}

.verdict-text {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.analysis-date {
  font-size: 11px;
  color: #999999;
}

.analysis-claim {
  font-size: 13px;
  color: #333333;
  line-height: 1.3;
  margin-bottom: 4px;
}

.analysis-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-height: 40px;
}

.confidence-info {
  font-size: 11px;
  color: #666666;
}

.delete-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.delete-btn:hover {
  background: #f5f5f5;
}

.show-more {
  padding: 12px 20px;
  border-top: 1px solid #e9ecef;
  background: #f8f9fa;
  text-align: center;
}

.show-more-btn {
  background: none;
  border: 1px solid #e9ecef;
  color: #666666;
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 4px;
}

.show-more-btn:hover {
  background: #e9ecef;
}

.dropdown-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 999;
  background: transparent;
}

/* Dropdown animation */
.dropdown-fade-enter-active, .dropdown-fade-leave-active {
  transition: all 0.2s ease;
}

.dropdown-fade-enter-from, .dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.dropdown-fade-enter-to, .dropdown-fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}

/* Responsive design */
@media (max-width: 768px) {
  .dropdown-menu {
    right: -20px;
    left: -20px;
    min-width: auto;
    max-width: none;
  }
  
  .dropdown-header {
    padding: 12px 16px;
  }
  
  .analysis-item {
    padding: 10px 16px;
  }
}
</style>
