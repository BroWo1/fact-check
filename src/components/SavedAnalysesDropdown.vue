<template>
  <div class="saved-analyses-dropdown">
    <Button
      class="dropdown-trigger"
      @click="toggleDropdown"
      :class="{ 'has-analyses': hasAnalyses || hasWorkspaces }"
    >
      <Files :size="16"/> {{ currentTab === 'analyses' ? t('savedAnalyses.title') : t('workspace.workspaces') }}
      <span v-if="currentTab === 'analyses' && hasAnalyses" class="analysis-count">({{ savedAnalyses.length }})</span>
      <span v-if="currentTab === 'workspaces' && hasWorkspaces" class="analysis-count">({{ workspaces.length }})</span>
      <span class="dropdown-arrow" :class="{ 'open': isOpen }">▼</span>
    </Button>

    <transition name="dropdown-fade">
      <div v-if="isOpen" class="dropdown-menu" @click.stop>
        <div class="dropdown-header">
          <div class="tab-selector">
            <Button
              :class="['tab-btn', { active: currentTab === 'analyses' }]"
              @click="currentTab = 'analyses'"
            >
              {{ t('savedAnalyses.analyses') }}
            </Button>
            <Button
              :class="['tab-btn', { active: currentTab === 'workspaces' }]"
              @click="currentTab = 'workspaces'"
            >
              {{ t('workspace.workspaces') }}
            </Button>
          </div>
          <Button
            v-if="(currentTab === 'analyses' && hasAnalyses) || (currentTab === 'workspaces' && hasWorkspaces)"
            class="clear-all-btn"
            size="small"
            @click="confirmClearAll"
          >
            {{ currentTab === 'analyses' ? t('savedAnalyses.clearAll') : t('workspace.clearAll') }}
          </Button>
        </div>

        <!-- Analyses Tab Content -->
        <div v-if="currentTab === 'analyses'">
          <div v-if="!hasAnalyses" class="empty-state">
            <p>{{ t('savedAnalyses.noAnalyses') }}</p>
          </div>
          <div v-else class="analyses-list">
            <div
              v-for="analysis in recentAnalyses"
              :key="analysis.id"
              class="analysis-card"
              @click="selectAnalysis(analysis)"
            >
            <div class="card-header">
              <div class="card-badge">
                <span class="mode-icon" :class="analysis.mode || 'fact_check'">
                  {{ (analysis.mode || 'fact_check') === 'fact_check' ? '🔍' : ((analysis.mode || 'fact_check') === 'research' ? '📚' : '🧠') }}
                </span>
                <span class="mode-text">
                  {{ (analysis.mode || 'fact_check') === 'fact_check' ? 'Fact Check' : ((analysis.mode || 'fact_check') === 'research' ? 'Research' : 'Define') }}
                </span>
              </div>
              <Button
                class="card-delete-btn"
                size="small"
                @click.stop="deleteAnalysis(analysis.id)"
              >
                ✕
              </Button>
            </div>

            <div class="card-content">
              <div class="card-claim">
                {{ formatAnalysisForDisplay(analysis).shortClaim }}
              </div>

              <div class="card-summary" v-if="analysis.summary">
                {{ formatAnalysisForDisplay(analysis).shortSummary }}
              </div>

              <div class="card-meta">
                <div class="card-result" v-if="(analysis.mode || 'fact_check') === 'fact_check' && analysis.verdict">
                  <span class="result-icon">{{ getVerdictIcon(analysis.verdict) }}</span>
                  <span class="result-text" :style="{ color: getVerdictColor(analysis.verdict) }">
                    {{ t(`verdict.${analysis.verdict}`) || analysis.verdict }}
                  </span>
                  <span class="result-confidence">
                    {{ formatAnalysisForDisplay(analysis).confidencePercent }}%
                  </span>
                </div>
                <div class="card-date">
                  {{ formatAnalysisForDisplay(analysis).displayDate }}
                </div>
              </div>
            </div>
          </div>
          
          <div v-if="savedAnalyses.length > 10" class="show-more">
            <Button class="show-more-btn" @click="showAllAnalyses">
              {{ t('savedAnalyses.showMore') }} ({{ savedAnalyses.length - 10 }} {{ t('savedAnalyses.more') }})
            </Button>
          </div>
        </div>
        </div>

        <!-- Workspaces Tab Content -->
        <div v-if="currentTab === 'workspaces'">
          <div v-if="!hasWorkspaces" class="empty-state">
            <p>{{ t('workspace.noWorkspaces') }}</p>
            <Button 
              type="primary" 
              size="small" 
              @click="createNewWorkspace"
              class="create-workspace-btn"
            >
              {{ t('workspace.createFirst') }}
            </Button>
          </div>
          <div v-else class="workspaces-list">
            <div
              v-for="workspace in recentWorkspaces"
              :key="workspace.id"
              class="workspace-card"
              @click="selectWorkspace(workspace)"
            >
              <div class="card-header">
                <div class="card-badge">
                  <span class="mode-icon">🎨</span>
                  <span class="mode-text">{{ t('workspace.workspace') }}</span>
                </div>
                <Button
                  class="card-delete-btn"
                  size="small"
                  @click.stop="deleteWorkspace(workspace.id)"
                >
                  ✕
                </Button>
              </div>

              <div class="card-content">
                <div class="card-claim">
                  {{ workspace.name }}
                </div>

                <div class="workspace-meta">
                  <div class="workspace-stats">
                    <span class="stat-item">
                      💬 {{ workspace.chatHistory?.length || 0 }}
                    </span>
                    <span class="stat-item">
                      📄 {{ workspace.canvasItems?.length || 0 }}
                    </span>
                  </div>
                  <div class="card-date">
                    {{ formatWorkspaceDate(workspace.updatedAt) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div v-if="workspaces.length > 10" class="show-more">
            <Button class="show-more-btn" @click="showAllWorkspaces">
              {{ t('workspace.showMore') }} ({{ workspaces.length - 10 }} {{ t('workspace.more') }})
            </Button>
          </div>
        </div>
      </div>
    </transition>

    <div
      v-if="isOpen"
      class="dropdown-backdrop"
      @click="closeDropdown"
    ></div>

    <Modal
      v-model:visible="isModalVisible"
      :title="t('savedAnalyses.allAnalysesTitle', 'All Saved Analyses')"
      :footer="null"
      @cancel="handleModalClose"
      width="600px"
      class="all-analyses-modal"
    >
      <div class="modal-analyses-list">
        <div
          v-for="analysis in savedAnalyses"
          :key="analysis.id"
          class="analysis-card"
          @click="selectAnalysis(analysis)"
        >
          <div class="card-header">
            <div class="card-badge">
              <span class="mode-icon" :class="analysis.mode || 'fact_check'">
                {{ (analysis.mode || 'fact_check') === 'fact_check' ? '🔍' : ((analysis.mode || 'fact_check') === 'research' ? '📚' : '🧠') }}
              </span>
              <span class="mode-text">
                {{ (analysis.mode || 'fact_check') === 'fact_check' ? 'Fact Check' : ((analysis.mode || 'fact_check') === 'research' ? 'Research' : 'Define') }}
              </span>
            </div>
            <Button
              class="card-delete-btn"
              size="small"
              @click.stop="deleteAnalysis(analysis.id)"
            >
              ✕
            </Button>
          </div>
          <div class="card-content">
            <div class="card-claim">
              {{ formatAnalysisForDisplay(analysis).shortClaim }}
            </div>
            
            <div class="card-summary" v-if="analysis.summary">
              {{ formatAnalysisForDisplay(analysis).shortSummary }}
            </div>
            
            <div class="card-meta">
              <div class="card-result" v-if="(analysis.mode || 'fact_check') === 'fact_check' && analysis.verdict">
                <span class="result-icon">{{ getVerdictIcon(analysis.verdict) }}</span>
                <span class="result-text" :style="{ color: getVerdictColor(analysis.verdict) }">
                  {{ t(`verdict.${analysis.verdict}`) || analysis.verdict }}
                </span>
                <span class="result-confidence">
                  {{ formatAnalysisForDisplay(analysis).confidencePercent }}%
                </span>
              </div>
              <div class="card-date">
                {{ formatAnalysisForDisplay(analysis).displayDate }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Button, Modal } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useSavedAnalyses } from '../composables/useSavedAnalyses'
import { useWorkspace } from '../composables/useWorkspace'
import { Files } from 'lucide-vue-next'

const { t } = useI18n()
const router = useRouter()
const emit = defineEmits(['select-analysis', 'select-workspace'])

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

const {
  getAllWorkspaces,
  createWorkspace,
  deleteWorkspace: removeWorkspace
} = useWorkspace()

const isOpen = ref(false)
const isModalVisible = ref(false)
const currentTab = ref('analyses')

const workspaces = computed(() => getAllWorkspaces())
const hasWorkspaces = computed(() => workspaces.value.length > 0)
const recentWorkspaces = computed(() => workspaces.value.slice(0, 10))

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

const closeDropdown = () => {
  isOpen.value = false
}

const selectAnalysis = (analysis) => {
  emit('select-analysis', analysis)
  closeDropdown()
  handleModalClose()
}

const confirmClearAll = () => {
  const message = currentTab.value === 'analyses' 
    ? t('savedAnalyses.confirmClearAll')
    : t('workspace.confirmClearAll')
  
  Modal.confirm({
    title: 'Clear All',
    content: message,
    okText: 'Yes, Clear All',
    okType: 'danger',
    cancelText: 'Cancel',
    onOk() {
      if (currentTab.value === 'analyses') {
        clearAllAnalyses()
      } else {
        workspaces.value.forEach(workspace => removeWorkspace(workspace.id))
      }
    }
  })
}

const createNewWorkspace = () => {
  const workspace = createWorkspace()
  router.push(`/workspace/${workspace.id}`)
  closeDropdown()
}

const selectWorkspace = (workspace) => {
  emit('select-workspace', workspace)
  router.push(`/workspace/${workspace.id}`)
  closeDropdown()
  handleModalClose()
}

const deleteWorkspace = (workspaceId) => {
  Modal.confirm({
    title: 'Delete Workspace',
    content: t('workspace.confirmDelete'),
    okText: 'Yes, Delete',
    okType: 'danger',
    cancelText: 'Cancel',
    onOk() {
      removeWorkspace(workspaceId)
    }
  })
}

const formatWorkspaceDate = (timestamp) => {
  return new Date(timestamp).toLocaleDateString()
}

const showAllWorkspaces = () => {
  isModalVisible.value = true
  closeDropdown()
}

const showAllAnalyses = () => {
  isModalVisible.value = true
  closeDropdown()
}

const handleModalClose = () => {
  isModalVisible.value = false
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
@font-face {
  font-family: 'LXGW Neo ZhiSong Plus';
  src: url('./assets/fonts/LXGWNeoZhiSongPlus.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}

.saved-analyses-dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-trigger {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 8px 16px;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.dropdown-trigger:hover {
  background: #e9ecef;
  border-color: #000000;
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
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 400px;
  max-width: 480px;
  max-height: 500px;
  overflow-y: auto;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
}

.dropdown-header {
  position: sticky;
  top: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: #ffffff;
  border-bottom: 1px solid #f0f0f0;
  z-index: 1001;
  max-height: 72px;
}

.tab-selector {
  display: flex;
  background: #f5f5f5;
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
}

.tab-btn {
  flex: 1;
  background: transparent;
  border: none;
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 4px;
  transition: all 0.2s ease;
  color: #666;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
}

.tab-btn.active {
  background: #fff;
  color: #333;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.tab-btn:hover {
  color: #333;
}

.dropdown-header h3 {
  margin: 0;
  font-family: 'Playfair Display', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 16px;
  font-weight: 600;
  color: #000000;
}

.clear-all-btn {
  background: #f8f9fa;
  color: #666666;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  transition: all 0.2s ease;
}

.clear-all-btn:hover {
  background: #e9ecef;
  border-color: #000000;
  color: #000000;
}

.empty-state {
  padding: 30px 16px;
  text-align: center;
  color: #666666;
  background: #ffffff;
  margin: 6px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.analyses-list, .workspaces-list {
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.workspace-card {
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 8px 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border-left: 3px solid #fa8c16;
}

.workspace-card:hover {
  background: #f8f9fa;
  border-color: #d0d0d0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.workspace-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  max-height: 32px;
}

.workspace-stats {
  display: flex;
  gap: 8px;
}

.stat-item {
  font-size: 11px;
  color: #666;
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 2px;
  max-height: 32px;
}

.create-workspace-btn {
  margin-top: 12px;
}

.analysis-card {
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 8px 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.analysis-card:hover {
  background: #f8f9fa;
  border-color: #d0d0d0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
    max-height: 32px;

}

.card-badge {
  display: flex;
  align-items: center;
  gap: 6px;
}

.mode-icon {
  font-size: 14px;
}

.mode-icon.fact_check {
  color: #1890ff;
}

.mode-icon.research {
  color: #52c41a;
}

.mode-text {
  font-size: 11px;
  font-weight: 600;
  color: #666666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.card-delete-btn {
  background: none;
  border: none;
  padding: 2px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
  font-size: 11px;
  line-height: 1;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999999;
  opacity: 0.6;
}

.card-delete-btn:hover {
  background: #f0f0f0;
  color: #ff4d4f;
  opacity: 1;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-claim {
  font-size: 13px;
  color: #333333;
  line-height: 1.4;
  font-weight: 500;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-summary {
  font-size: 12px;
  color: #666666;
  line-height: 1.3;
  font-style: italic;
  margin-top: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  background: #f8f9fa;
  padding: 6px 8px;
  border-radius: 4px;
  border-left: 3px solid #e9ecef;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
    max-height: 32px;

}

.card-result {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
}

.result-icon {
  font-size: 12px;
}

.result-text {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.result-confidence {
  color: #666666;
  font-weight: 500;
}

.card-date {
  font-size: 11px;
  color: #999999;
  font-weight: 500;
  flex-shrink: 0;
}

.show-more {
  padding: 8px 16px;
  background: #ffffff;
  text-align: center;
  margin: 0 6px 6px 6px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.show-more-btn {
  background: none;
  border: 1px solid #e9ecef;
  color: #666666;
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 4px;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
}

.show-more-btn:hover {
  background: #e9ecef;
  border-color: #000000;
  color: #000000;
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

/* Modal styles */
.all-analyses-modal :deep(.ant-modal-body) {
  padding: 0;
}

.modal-analyses-list {
  max-height: 65vh;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #ffffff;
}

/* Dropdown animation */
.dropdown-fade-enter-active, .dropdown-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease, filter 0.2s ease;
}

.dropdown-fade-enter-from, .dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
  filter: blur(4px);
}

.dropdown-fade-enter-to, .dropdown-fade-leave-from {
  opacity: 1;
  transform: translateY(0);
  filter: blur(0);
}

/* Responsive design */
@media (max-width: 768px) {
  .dropdown-menu {
    position: fixed;
    right: 16px;
    left: 16px;
    top: auto;
    min-width: auto;
    max-width: none;
    width: auto;
    margin: 0;
    transform: translateY(8px);
  }

  .dropdown-header {
    padding: 8px 12px;
  }

  .dropdown-header h3 {
    font-size: 15px;
  }

  .analyses-list {
    padding: 6px;
    gap: 5px;
  }

  .analysis-card {
    padding: 8px 10px;
  }

  .card-header {
    margin-bottom: 3px;
  }

  .mode-icon {
    font-size: 15px;
  }

  .mode-text {
    font-size: 12px;
  }

  .card-delete-btn {
    width: 22px;
    height: 22px;
    font-size: 11px;
  }

  .card-content {
    gap: 3px;
  }

  .card-claim {
    font-size: 14px;
    line-height: 1.3;
  }

  .card-meta {
    gap: 12px;
  }

  .card-result {
    font-size: 12px;
    gap: 5px;
  }

  .result-icon {
    font-size: 13px;
  }

  .card-date {
    font-size: 12px;
  }

  .empty-state {
    margin: 6px;
    padding: 24px 12px;
  }

  .show-more {
    margin: 0 6px 6px 6px;
    padding: 6px 12px;
  }
}

/* Scrollbar styling */
.dropdown-menu::-webkit-scrollbar,
.modal-analyses-list::-webkit-scrollbar {
  width: 4px;
}

.dropdown-menu::-webkit-scrollbar-track,
.modal-analyses-list::-webkit-scrollbar-track {
  background: #f8f9fa;
}

.dropdown-menu::-webkit-scrollbar-thumb,
.modal-analyses-list::-webkit-scrollbar-thumb {
  background: #e9ecef;
  border-radius: 2px;
}

.dropdown-menu::-webkit-scrollbar-thumb:hover,
.modal-analyses-list::-webkit-scrollbar-thumb:hover {
  background: #d0d0d0;
}
</style>
