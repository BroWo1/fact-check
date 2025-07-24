<template>
  <Transition name="modal" appear>
    <div v-if="visible" class="edit-modal-overlay" @click="handleOverlayClick">
      <div class="edit-modal" :style="modalPosition" @click.stop>
        <!-- Loading overlay when submitting -->
        <div v-if="isSubmitting" class="modal-loading-overlay" :class="{ 'completed': loadingStage === 'completed' }">
          <div class="modal-loading-content">
            <div v-if="loadingStage !== 'completed'" class="large-spinner"></div>
            <div v-else class="completion-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#52c41a" stroke-width="2" />
                <path d="m9 12 2 2 4-4" stroke="#52c41a" stroke-width="2" stroke-linecap="round"
                  stroke-linejoin="round" />
              </svg>
            </div>
            <h4 class="loading-title">{{ loadingTitle }}</h4>
            <p class="loading-description">{{ loadingDescription }}</p>
            <div v-if="loadingStage !== 'completed'" class="progress-bar">
              <div class="progress-fill"></div>
            </div>
          </div>
        </div>

        <div class="edit-modal-header">
          <h3 class="edit-modal-title">{{ t('research.editSection') }}</h3>
          <button class="close-button" @click="closeModal">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M12 4l-8 8m0-8l8 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"
                stroke-linejoin="round" />
            </svg>
          </button>
        </div>

        <div class="edit-modal-content" :class="{ 'submitting': isSubmitting }">
          <div class="section-preview">
            <h4 class="section-title">{{ sectionData.title }}</h4>
            <div class="section-text" v-html="sectionData.content"></div>
          </div>

          <div class="edit-form">
            <label class="form-label">{{ t('research.editPrompt') }}</label>
            <textarea v-model="editPrompt" class="edit-textarea" :placeholder="t('research.editPromptPlaceholder')"
              rows="4" @keydown.ctrl.enter="submitEdit" @keydown.meta.enter="submitEdit"
              :disabled="isSubmitting"></textarea>

            <div class="form-actions">
              <button class="submit-button" @click="submitEdit" :disabled="!editPrompt.trim() || isSubmitting"
                :class="{ 'submitting': isSubmitting }">
                <div v-if="isSubmitting" class="loading-container">
                  <div class="loading-spinner"></div>
                  <div class="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
                <span v-else class="button-text">{{ t('research.submitEdit') }}</span>
                <span v-if="isSubmitting" class="loading-text">{{ t('research.editing') }}</span>
              </button>
              <button class="cancel-button" @click="closeModal" :disabled="isSubmitting">
                {{ t('common.cancel') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { notification } from 'ant-design-vue'

const { t } = useI18n()

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  sectionData: {
    type: Object,
    default: () => ({
      title: '',
      content: '',
      id: '',
      originalMarkdown: ''
    })
  },
  targetElement: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'submit-edit'])

const editPrompt = ref('')
const isSubmitting = ref(false)
const loadingStage = ref('submitting') // 'submitting', 'processing', 'polling', 'completed'
const pollingProgress = ref({ current: 0, max: 0 })

// Dynamic loading messages based on stage
const loadingTitle = computed(() => {
  switch (loadingStage.value) {
    case 'submitting':
      return t('research.editing')
    case 'processing':
      return 'Processing Edit Request...'
    case 'polling':
      return 'Generating Improved Content...'
    case 'completed':
      return 'Edit Completed Successfully!'
    default:
      return t('research.editing')
  }
})

const loadingDescription = computed(() => {
  switch (loadingStage.value) {
    case 'submitting':
      return 'Sending your edit request to the server...'
    case 'processing':
      return 'Your edit is being queued for AI processing...'
    case 'polling':
      return 'AI is analyzing and improving your section content...'
    case 'completed':
      return 'Your section has been successfully updated with improved content!'
    default:
      return 'This may take a few minutes for complex edits...'
  }
})

// Expose method to update loading stage from parent
const updateLoadingStage = (stage, current = 0, max = 0) => {
  loadingStage.value = stage
  pollingProgress.value = { current, max }
}

// Expose method to reset modal state
const resetModalState = () => {
  isSubmitting.value = false
  loadingStage.value = 'submitting'
  pollingProgress.value = { current: 0, max: 0 }
}

// Expose the methods to parent component
defineExpose({
  updateLoadingStage,
  resetModalState
})

// Calculate modal position - right side on desktop, center on mobile
const modalPosition = computed(() => {
  const isMobile = window.innerWidth <= 768

  // For mobile devices, always center the modal
  if (isMobile) {
    return {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      animation: 'modalFadeIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    }
  }

  // For desktop, position on the right side of the screen
  const modalWidth = 420
  const modalHeight = 500
  const rightPadding = 40 // Distance from the right edge of the screen

  // Calculate position on the right side with proper padding
  const left = window.innerWidth - modalWidth - rightPadding

  // Center vertically in the viewport
  const top = Math.max(20, (window.innerHeight - modalHeight) / 2)

  return {
    position: 'fixed',
    left: `${Math.max(20, left)}px`,
    top: `${top}px`,
    transform: 'translateZ(0)', // Hardware acceleration
    animation: 'modalSlideInFromRight 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
  }
})

// Clear form when modal closes
watch(() => props.visible, (newVisible) => {
  if (!newVisible) {
    editPrompt.value = ''
    isSubmitting.value = false
    loadingStage.value = 'submitting'
    pollingProgress.value = { current: 0, max: 0 }
  } else {
    // Focus the textarea when modal opens
    nextTick(() => {
      const textarea = document.querySelector('.edit-textarea')
      if (textarea) {
        textarea.focus()
      }
    })
  }
})

const handleOverlayClick = (event) => {
  if (event.target === event.currentTarget) {
    closeModal()
  }
}

const closeModal = () => {
  if (!isSubmitting.value) {
    emit('close')
  }
}

const submitEdit = async () => {
  if (!editPrompt.value.trim() || isSubmitting.value) {
    return
  }

  isSubmitting.value = true
  loadingStage.value = 'submitting'

  try {
    // After a short delay, move to processing stage
    setTimeout(() => {
      if (isSubmitting.value) {
        loadingStage.value = 'processing'
      }
    }, 1000)

    // Don't await here - let the parent handle the async operation
    // while we keep the modal open to show progress
    emit('submit-edit', {
      sectionId: props.sectionData.id,
      sectionTitle: props.sectionData.title,
      originalContent: props.sectionData.originalMarkdown,
      editPrompt: editPrompt.value.trim()
    })

    // Don't close modal immediately - let parent component handle completion
  } catch (error) {
    console.error('Edit submission failed:', error)

    // Show appropriate error message based on error type
    let errorMessage = t('research.editFailed')
    let errorDescription = t('research.editFailedDescription')

    if (error.message?.includes('Edit session not found')) {
      errorDescription = 'The edit session could not be found. This may be a temporary server issue. Please try again.'
    } else if (error.type === 'network_error') {
      errorDescription = 'Network timeout. The server may still be processing your request. Please try again in a moment.'
    } else if (error.status === 500) {
      errorDescription = 'Server error occurred while processing your edit. This may be a temporary issue - please try again, or try a simpler edit request.'
    } else if (error.status === 504) {
      errorDescription = 'Request timeout. Please try a simpler edit or try again later.'
    } else if (error.status === 502 || error.status === 503) {
      errorDescription = 'Server is temporarily unavailable. Please try again in a few moments.'
    } else if (error.message) {
      errorDescription = error.message
    }

    notification.error({
      message: errorMessage,
      description: errorDescription,
      duration: 6
    })

    isSubmitting.value = false
    loadingStage.value = 'submitting'
  }
}
</script>

<style scoped>
@font-face {
  font-family: 'LXGW Neo ZhiSong Plus';
  src: url('../assets/fonts/LXGWNeoZhiSongPlus.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}

.edit-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.2);
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

/* Modal transition animations */
.modal-enter-active {
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.modal-leave-active {
  transition: all 0.2s ease-out;
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

.modal-enter-from .edit-modal {
  transform: scale(0.95) translateY(20px);
  opacity: 0;
  filter: blur(4px);
}

.modal-enter-to .edit-modal {
  transform: scale(1) translateY(0);
  opacity: 1;
  filter: blur(0);
}

.modal-leave-from .edit-modal {
  transform: scale(1) translateY(0);
  opacity: 1;
  filter: blur(0);
}

.modal-leave-to .edit-modal {
  transform: scale(0.95) translateY(10px);
  opacity: 0;
  filter: blur(2px);
}

.edit-modal {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
  width: 420px;
  max-width: 90vw;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.modal-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  animation: loadingFadeIn 0.3s ease-out;
}

@keyframes loadingFadeIn {
  from {
    opacity: 0;
    backdrop-filter: blur(0);
  }

  to {
    opacity: 1;
    backdrop-filter: blur(8px);
  }
}

.modal-loading-content {
  text-align: center;
  padding: 48px 24px;
  max-width: 300px;
  animation: contentSlideIn 0.4s ease-out 0.2s both;
}

@keyframes contentSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.large-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid #e6f7ff;
  border-top: 3px solid #1890ff;
  border-radius: 50%;
  animation: spin 1s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
  margin: 0 auto 24px;
}

.loading-title {
  font-family: 'Playfair Display', 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 18px;
  font-weight: 600;
  color: #000000;
  margin: 0 0 8px 0;
  letter-spacing: -0.3px;
}

.loading-description {
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 14px;
  color: #666666;
  margin: 0 0 24px 0;
  line-height: 1.6;
  opacity: 0.9;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: #f0f0f0;
  border-radius: 2px;
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #1890ff 0%, #40a9ff 50%, #1890ff 100%);
  background-size: 200% 100%;
  border-radius: 2px;
  animation: progressShimmer 2s linear infinite;
}

@keyframes progressShimmer {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}

.modal-loading-overlay.completed {
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(12px);
}

.completion-icon {
  margin: 0 auto 24px;
  animation: successBounce 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.completion-icon svg {
  filter: drop-shadow(0 4px 12px rgba(82, 196, 26, 0.25));
}

@keyframes successBounce {
  0% {
    transform: scale(0) rotate(-180deg);
    opacity: 0;
  }

  50% {
    transform: scale(1.15) rotate(10deg);
  }

  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}

.modal-loading-overlay.completed .loading-title {
  color: #52c41a;
  animation: titleSuccess 0.5s ease-out 0.3s both;
}

.modal-loading-overlay.completed .loading-description {
  color: #389e0d;
  animation: descriptionFade 0.5s ease-out 0.5s both;
}

@keyframes titleSuccess {
  0% {
    opacity: 0;
    transform: translateY(10px);
  }

  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes descriptionFade {
  0% {
    opacity: 0;
  }

  100% {
    opacity: 0.9;
  }
}

.edit-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.edit-modal-title {
  font-family: 'Playfair Display', 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 18px;
  font-weight: 600;
  color: #000000;
  margin: 0;
  letter-spacing: -0.3px;
}

.close-button {
  background: transparent;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #999999;
  border-radius: 6px;
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
}

.close-button:hover {
  background: rgba(0, 0, 0, 0.06);
  color: #000000;
  transform: scale(1.1);
}

.close-button svg {
  transition: transform 0.2s ease;
}

.close-button:hover svg {
  transform: rotate(90deg);
}

.edit-modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  transition: opacity 0.3s ease, filter 0.3s ease;
}

.edit-modal-content.submitting {
  opacity: 0.4;
  pointer-events: none;
  filter: blur(1px);
}

.section-preview {
  background: #fafafa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  max-height: 150px;
  overflow-y: auto;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.section-preview::-webkit-scrollbar {
  width: 4px;
}

.section-preview::-webkit-scrollbar-track {
  background: #f0f0f0;
  border-radius: 2px;
}

.section-preview::-webkit-scrollbar-thumb {
  background: #d0d0d0;
  border-radius: 2px;
}

.section-preview::-webkit-scrollbar-thumb:hover {
  background: #b0b0b0;
}

.section-title {
  font-family: 'Playfair Display', 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 16px;
  font-weight: 600;
  color: #000000;
  margin: 0 0 12px 0;
  text-align: center;
  padding-bottom: 8px;
  border-bottom: 1px solid #e9ecef;
}

.section-text {
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 14px;
  line-height: 1.6;
  color: #333333;
}

.section-text :deep(p) {
  margin: 10px 0;
}

.section-text :deep(ul),
.section-text :deep(ol) {
  margin: 10px 0;
  padding-left: 24px;
}

.section-text :deep(li) {
  margin: 6px 0;
}

.edit-form {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-label {
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 14px;
  font-weight: 600;
  color: #000000;
  margin-bottom: 8px;
  display: block;
  letter-spacing: -0.2px;
}

.edit-textarea {
  width: 100%;
  min-height: 100px;
  padding: 12px;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  transition: all 0.2s ease;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.edit-textarea:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05);
  transform: translateY(-1px);
}

.edit-textarea::placeholder {
  color: #999999;
  opacity: 0.8;
}

.edit-textarea:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
  opacity: 0.7;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: auto;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}

.submit-button {
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 10px 24px;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 130px;
  min-height: 40px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(24, 144, 255, 0.2);
  letter-spacing: -0.2px;
}

.submit-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
}

.submit-button:hover:not(:disabled)::before {
  left: 100%;
}

.submit-button:active:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(24, 144, 255, 0.2);
}

.submit-button:disabled {
  background: #f0f0f0;
  color: #999999;
  cursor: not-allowed;
  box-shadow: none;
}

.submit-button.submitting {
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  color: #ffffff;
  cursor: wait;
}

.loading-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid #ffffff;
  border-radius: 50%;
  animation: spin 0.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
}

.loading-dots {
  display: flex;
  gap: 4px;
}

.loading-dots span {
  width: 5px;
  height: 5px;
  background: #ffffff;
  border-radius: 50%;
  animation: loadingBounce 1.4s ease-in-out infinite both;
}

.loading-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

.loading-dots span:nth-child(3) {
  animation-delay: 0;
}

@keyframes loadingBounce {

  0%,
  80%,
  100% {
    opacity: 0.4;
    transform: scale(0.8) translateY(0);
  }

  40% {
    opacity: 1;
    transform: scale(1.2) translateY(-5px);
  }
}

.loading-text {
  font-size: 13px;
  opacity: 0.95;
  margin-left: 4px;
  font-weight: 500;
}

.cancel-button {
  background: #ffffff;
  color: #666666;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 10px 24px;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 40px;
  font-weight: 500;
  letter-spacing: -0.2px;
}

.cancel-button:hover:not(:disabled) {
  background: #fafafa;
  border-color: #d0d0d0;
  color: #000000;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.cancel-button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.cancel-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f5f5f5;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .edit-modal {
    width: 95vw;
    max-height: 85vh;
    margin: 16px;
  }

  .edit-modal-header {
    padding: 16px 20px;
  }

  .edit-modal-title {
    font-size: 16px;
  }

  .close-button {
    width: 28px;
    height: 28px;
    padding: 6px;
  }

  .edit-modal-content {
    padding: 20px;
    gap: 16px;
  }

  .section-preview {
    padding: 14px;
    max-height: 120px;
  }

  .section-title {
    font-size: 15px;
    margin-bottom: 10px;
  }

  .section-text {
    font-size: 13px;
  }

  .form-label {
    font-size: 13px;
    margin-bottom: 6px;
  }

  .edit-textarea {
    font-size: 13px;
    min-height: 85px;
    padding: 10px;
  }

  .form-actions {
    flex-direction: column;
    gap: 10px;
    padding-top: 16px;
  }

  .submit-button,
  .cancel-button {
    width: 100%;
    min-height: 38px;
    font-size: 13px;
    padding: 10px 20px;
  }

  .modal-loading-content {
    padding: 36px 20px;
    max-width: 260px;
  }

  .loading-title {
    font-size: 16px;
  }

  .loading-description {
    font-size: 13px;
    margin-bottom: 20px;
  }

  .large-spinner {
    width: 40px;
    height: 40px;
    margin-bottom: 20px;
  }

  .completion-icon svg {
    width: 40px;
    height: 40px;
  }
}

/* Additional hover and interaction animations */
@media (hover: hover) {
  .edit-modal {
    transform-origin: center center;
  }

  .edit-modal:hover {
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.08);
  }
}

/* Smooth scrollbar styling to match other components */
.edit-modal-content::-webkit-scrollbar {
  width: 4px;
}

.edit-modal-content::-webkit-scrollbar-track {
  background: #f8f9fa;
}

.edit-modal-content::-webkit-scrollbar-thumb {
  background: #e9ecef;
  border-radius: 2px;
}

.edit-modal-content::-webkit-scrollbar-thumb:hover {
  background: #d0d0d0;
}

/* Focus visible styles for accessibility */
.close-button:focus-visible,
.submit-button:focus-visible,
.cancel-button:focus-visible,
.edit-textarea:focus-visible {
  outline: 2px solid #1890ff;
  outline-offset: 2px;
}

/* Modal animations for different positions */
@keyframes modalSlideInFromRight {
  0% {
    opacity: 0;
    transform: translateX(40px) scale(0.95);
  }

  100% {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

@keyframes modalFadeIn {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.95);
  }

  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
</style>