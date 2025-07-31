<template>
  <Transition name="inline-expand" appear @enter="onEnter" @leave="onLeave">
    <div v-if="visible" class="inline-edit-wrapper">
      <div class="inline-edit-container">
        <div class="inline-edit-content" :class="{ 'submitting': isSubmitting }">
          <!-- Loading overlay when submitting -->
          <div v-if="isSubmitting" class="inline-loading-overlay"
            :class="{ 'completed': loadingStage === 'completed' }">
            <div class="inline-loading-content">
              <div v-if="loadingStage !== 'completed'" class="large-spinner"></div>
              <div v-else class="completion-icon">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#52c41a" stroke-width="2" />
                  <path d="m9 12 2 2 4-4" stroke="#52c41a" stroke-width="2" stroke-linecap="round"
                    stroke-linejoin="round" />
                </svg>
              </div>
              <h4 class="loading-title">{{ loadingTitle }}</h4>
              <p class="loading-description">{{ loadingDescription }}</p>
            </div>
          </div>

          <div class="inline-edit-header">
            <h3 class="inline-edit-title">{{ t('research.editSection') }}</h3>
            <button class="close-button" @click="closeModal">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M12 4l-8 8m0-8l8 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"
                  stroke-linejoin="round" />
              </svg>
            </button>
          </div>


          <div class="edit-form">
            <textarea v-model="editPrompt" class="edit-textarea" :placeholder="t('research.editPromptPlaceholder')"
              rows="3" @keydown.ctrl.enter="submitEdit" @keydown.meta.enter="submitEdit"
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
  }
})

const emit = defineEmits(['close', 'submit-edit'])

const editPrompt = ref('')
const isSubmitting = ref(false)
const loadingStage = ref('submitting') // 'submitting', 'processing', 'polling', 'completed'

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
      return 'AI is analyzing and improving your section content... (1 min. est.)'
    case 'completed':
      return 'Your section has been successfully updated with improved content!'
    default:
      return 'This may take a few minutes for complex edits...'
  }
})

// Expose method to update loading stage from parent
const updateLoadingStage = (stage) => {
  loadingStage.value = stage
}

// Expose method to reset modal state
const resetModalState = () => {
  isSubmitting.value = false
  loadingStage.value = 'submitting'
}

// Expose the methods to parent component
defineExpose({
  updateLoadingStage,
  resetModalState
})

// Clear form when modal closes
watch(() => props.visible, (newVisible) => {
  if (!newVisible) {
    editPrompt.value = ''
    isSubmitting.value = false
    loadingStage.value = 'submitting'
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

const closeModal = () => {
  if (!isSubmitting.value) {
    emit('close')
  }
}

// Transition hooks for smooth height animation
const onEnter = (el) => {
  const content = el.querySelector('.inline-edit-content')
  el.style.height = '0'
  el.style.opacity = '0'
  if (content) {
    content.style.opacity = '0'
    content.style.filter = 'blur(4px)'
    content.style.transition = 'opacity 0.3s ease 0.1s, filter 0.3s ease 0.1s' // Delay content animation
  }
  el.offsetHeight // force reflow
  el.style.transition = 'height 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.25s ease-out'
  el.style.height = el.scrollHeight + 'px'
  el.style.opacity = '1'
  
  // Trigger content animation after a small delay
  if (content) {
    setTimeout(() => {
      content.style.opacity = '1'
      content.style.filter = 'blur(0)'
    }, 50)
  }
}

const onLeave = (el) => {
  const content = el.querySelector('.inline-edit-content')
  el.style.height = el.scrollHeight + 'px'
  el.style.opacity = '1'
  if (content) {
    content.style.opacity = '1'
    content.style.filter = 'blur(0)'
  }
  el.offsetHeight // force reflow
  el.style.transition = 'height 0.25s cubic-bezier(0.55, 0.085, 0.68, 0.53), opacity 0.25s ease-in'
  if (content) {
    content.style.transition = 'opacity 0.2s ease, filter 0.2s ease'
    content.style.opacity = '0'
    content.style.filter = 'blur(4px)'
  }
  el.style.height = '0'
  el.style.opacity = '0'
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

/* Inline edit container with smooth transitions */
.inline-edit-container {
  position: relative;
  background-color: #fafafa; 
  border: 1px solid #e9ecef;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform-origin: center top;
  will-change: transform, opacity;
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

/* Smooth wrapper transition with JavaScript height animation */
.inline-edit-wrapper {
  overflow: hidden;
  margin: 12px 0;
}

/* Enhanced transition animations - handled by JavaScript hooks */
.inline-expand-enter-active,
.inline-expand-leave-active {
  /* Transitions are handled by JavaScript hooks for smoother height animation */
}

.inline-edit-content {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  min-height: 0;
  opacity: 1;
  filter: blur(0);
  transition: padding 0.2s ease, opacity 0.2s ease, filter 0.2s ease;
}

.inline-edit-content.submitting {
  opacity: 0.3;
  pointer-events: none;
  filter: blur(2px);
}

.inline-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fafafa;
  backdrop-filter: blur(12px);
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  animation: loadingFadeIn 0.4s ease-out;
}

@keyframes loadingFadeIn {
  from {
    opacity: 0;
    backdrop-filter: blur(0);
    transform: scale(0.95);
  }

  to {
    opacity: 1;
    backdrop-filter: blur(12px);
    transform: scale(1);
  }
}

.inline-loading-content {
  text-align: center;
  padding: 32px 20px;
  max-width: 280px;
  animation: contentSlideIn 0.5s ease-out 0.15s both;
}

@keyframes contentSlideIn {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.95);
    filter: blur(1px);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

.large-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #f2f2f2;
  border-top: 3px solid #000000;
  border-radius: 50%;
  animation: spin 1.2s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
  margin: 0 auto 20px;
}

.loading-title {
  font-family: 'Playfair Display', 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 16px;
  font-weight: 600;
  color: #000000;
  margin: 0 0 6px 0;
  letter-spacing: -0.3px;
}

.loading-description {
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 13px;
  color: #666666;
  margin: 0;
  line-height: 1.6;
  opacity: 0.9;
}

.inline-loading-overlay.completed {
  background: #fafafa;
  backdrop-filter: blur(16px);
}

.completion-icon {
  margin: 0 auto 20px;
  animation: successBounce 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.completion-icon svg {
  filter: drop-shadow(0 4px 16px rgba(82, 196, 26, 0.3));
}

@keyframes successBounce {
  0% {
    transform: scale(0) rotate(-180deg);
    opacity: 0;
    filter: blur(2px);
  }

  50% {
    transform: scale(1.15) rotate(10deg);
    filter: blur(0);
  }

  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
    filter: blur(0);
  }
}

.inline-loading-overlay.completed .loading-title {
  color: #52c41a;
  animation: titleSuccess 0.6s ease-out 0.4s both;
}

.inline-loading-overlay.completed .loading-description {
  color: #389e0d;
  animation: descriptionFade 0.6s ease-out 0.6s both;
}

@keyframes titleSuccess {
  0% {
    opacity: 0;
    transform: translateY(12px) scale(0.95);
    filter: blur(1px);
  }

  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

@keyframes descriptionFade {
  0% {
    opacity: 0;
    transform: translateY(8px);
    filter: blur(1px);
  }

  100% {
    opacity: 0.9;
    transform: translateY(0);
    filter: blur(0);
  }
}

.inline-edit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #fafafa;
  max-height: 64px;
  min-height: 64px;
  border-bottom: 1px solid #f0f0f0;
}

.inline-edit-title {
  font-family: 'Playfair Display', 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif !important;
  font-size: 18px !important;
  font-weight: 700 !important;
  color: #000000 !important;
  margin: 0 !important;
  letter-spacing: -0.5px;
  line-height: 1.2;
  display: flex;
  align-items: center;
}

.close-button {
  background: transparent;
  border: none;
  padding: 6px;
  cursor: pointer;
  color: #999999;
  border-radius: 6px;
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
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


.edit-form {
  padding: 0 20px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  background-color: #fafafa;
}

.form-label {
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 13px;
  font-weight: 600;
  color: #000000;
  margin-bottom: 6px;
  display: block;
  letter-spacing: -0.2px;
}

.edit-textarea {
  width: 100%;
  min-height: 100px;
  padding: 10px;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  transition: all 0.2s ease;
  background: #ffffff;
  margin-top: 16px;
}

.edit-textarea:hover {
  border-color: #000000;
}

.edit-textarea:focus {
  outline: none;
  border-color: #000000;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
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
  gap: 10px;
  justify-content: flex-end;
}

.submit-button {
  background: #000000;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 0 20px;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 110px;
  height: 36px;
  position: relative;
  overflow: hidden;
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
  background: #333333;
  transform: translateY(-1px);
}

.submit-button:hover:not(:disabled)::before {
  left: 100%;
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  color: #858585;
}

.submit-button.submitting {
  background: #000000;
  color: #ffffff;
  cursor: wait;
}

.loading-container {
  display: flex;
  align-items: center;
  gap: 8px;

}

.loading-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid #ffffff;
  border-radius: 50%;
  animation: spin 0.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
}

.loading-dots {
  display: flex;
  gap: 3px;
}

.loading-dots span {
  width: 4px;
  height: 4px;
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
    transform: scale(1.2) translateY(-4px);
  }
}

.loading-text {
  font-size: 12px;
  opacity: 0.95;
  margin-left: 3px;
  font-weight: 500;
}

.cancel-button {
  background: #ffffff;
  color: #666666;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  padding: 0 20px;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  height: 36px;
  font-weight: 500;
  letter-spacing: -0.2px;
}

.cancel-button:hover:not(:disabled) {
  background: #f5f5f5;
  border-color: #000000;
  color: #000000;
  transform: translateY(-1px);
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
  .inline-edit-container {
    margin: 8px 0;
  }

  .inline-edit-header {
    padding: 12px 16px;
  }

  .inline-edit-title {
    font-size: 15px;
  }

  .close-button {
    width: 26px;
    height: 26px;
    padding: 5px;
  }

  .section-preview {
    margin: 12px 16px;
    padding: 12px;
    max-height: 100px;
  }

  .section-title {
    font-size: 14px;
    margin-bottom: 8px;
  }

  .section-text {
    font-size: 12px;
  }

  .edit-form {
    padding: 16px;
    gap: 12px;
  }

  .form-label {
    font-size: 12px;
    margin-bottom: 5px;
  }

  .edit-textarea {
    min-height: 70px;
    padding: 9px;
  }

  .form-actions {
    flex-direction: column;
    gap: 8px;
    padding-top: 12px;
  }

  .submit-button,
  .cancel-button {
    width: 100%;
    min-height: 34px;
    font-size: 12px;
    padding: 8px 16px;
  }

  .inline-loading-content {
    padding: 24px 16px;
    max-width: 240px;
  }

  .loading-title {
    font-size: 15px;
  }

  .loading-description {
    font-size: 12px;
  }

  .large-spinner {
    width: 32px;
    height: 32px;
    margin-bottom: 16px;
  }

  .completion-icon svg {
    width: 32px;
    height: 32px;
  }
}

/* Focus visible styles for accessibility */
.close-button:focus-visible,
.submit-button:focus-visible,
.cancel-button:focus-visible {
  outline: 2px solid #000000;
  outline-offset: 2px;
}

.edit-textarea:focus-visible {
  outline: none;
}
</style>