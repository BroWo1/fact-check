<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { Input, Button, Typography, message } from 'ant-design-vue';
import { marked } from 'marked';
import factCheckService from '../services/factCheckService';

const { t } = useI18n();

const props = defineProps({
  sessionId: {
    type: String,
    required: true
  },
  reportContent: {
    type: String,
    required: true
  },
  visible: {
    type: Boolean,
    default: true
  }
});

const question = ref('');
const response = ref('');
const isLoading = ref(false);
const isCollapsed = ref(true); // Start collapsed by default
const citation = ref(''); // Store selected text as citation

// Mobile/small screen specific state
const isMobile = ref(false);
const isMobileOverlayOpen = ref(false);

const hasResponse = computed(() => response.value && response.value.trim().length > 0);
const isSessionReady = computed(() => !!props.sessionId);

const processedResponse = computed(() => {
  if (!response.value) return '';
  
  // Configure marked options similar to ResearchResults
  marked.setOptions({
    breaks: true,
    gfm: true,
    smartypants: true
  });
  
  return marked(response.value);
});

const toggleCollapse = () => {
  if (isMobile.value) {
    isMobileOverlayOpen.value = !isMobileOverlayOpen.value;
  } else {
    isCollapsed.value = !isCollapsed.value;
  }
};

const closeMobileOverlay = () => {
  isMobileOverlayOpen.value = false;
};

// Check if mobile/small screen for responsive behavior
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 1200;
};

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
});

const handleSubmit = async () => {
  if (!question.value.trim()) {
    message.warning('Please enter a question');
    return;
  }

  if (!props.sessionId) {
    message.error('No active session found. Please wait for the analysis to complete.');
    return;
  }

  isLoading.value = true;
  response.value = '';

  try {
    // Combine citation and question
    let combinedQuestion = question.value;
    if (citation.value) {
      combinedQuestion = `Citation: "${citation.value}"\n\nQuestion: ${question.value}`;
    }

    const result = await factCheckService.quickAsk(
      props.sessionId, 
      {
        question: combinedQuestion,
        reportContent: props.reportContent
      },
      (status, attempt, maxAttempts) => {
        // Optional: Handle status updates for polling
        console.log(`Quick ask status: ${status} (${attempt}/${maxAttempts})`);
      }
    );
    
    response.value = result.answer || result.response || 'No response received';
  } catch (error) {
    console.error('Quick ask failed:', error);
    message.error(error.message || 'Failed to get AI response');
  } finally {
    isLoading.value = false;
  }
};

const handleKeyPress = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSubmit();
  }
};

const clearResponse = () => {
  response.value = '';
  question.value = '';
  citation.value = '';
};

// Handle citation from text selection
const handleCitation = (selectedText) => {
  citation.value = selectedText;
  // Open the component if collapsed
  if (isCollapsed.value && !isMobile.value) {
    isCollapsed.value = false;
  } else if (isMobile.value) {
    isMobileOverlayOpen.value = true;
  }
  
  // Focus the textarea after a short delay
  setTimeout(() => {
    const textarea = document.querySelector('.question-input textarea');
    if (textarea) {
      textarea.focus();
    }
  }, 100);
};

// Remove citation
const removeCitation = () => {
  citation.value = '';
};

defineExpose({
  handleCitation
});
</script>

<template>
  <!-- Mobile/Small Screen Floating Button -->
  <div v-if="visible && isMobile" class="mobile-quick-ask">
    <button 
      class="mobile-floating-button"
      @click="toggleCollapse"
      :disabled="!isSessionReady"
    >
      🤖
    </button>
  </div>

  <!-- Mobile Overlay -->
  <transition name="mobile-overlay">
    <div v-if="isMobile && isMobileOverlayOpen" class="mobile-overlay">
      <div class="mobile-overlay-backdrop" @click="closeMobileOverlay"></div>
      <div class="mobile-overlay-content">
        <div class="mobile-header">
          <h4 class="mobile-title">🤖 {{ t('aiQuickAsk.title') || 'Quick Ask AI' }}</h4>
          <button class="mobile-close-button" @click="closeMobileOverlay">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M12 4l-8 8m0-8l8 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        
        <div class="mobile-content">
          <div class="input-section">
            <!-- Citation Display -->
            <div v-if="citation" class="citation-display">
              <div class="citation-header">
                <span class="citation-label">📄 Citation</span>
                <button class="remove-citation" @click="removeCitation">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M9 3L3 9m0-6l6 6" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
              <div class="citation-text">{{ citation }}</div>
            </div>

            <Input.TextArea
              v-model:value="question"
              :placeholder="isSessionReady ? (t('aiQuickAsk.placeholder') || 'Ask about this report...') : 'Waiting for analysis to complete...'"
              :rows="2"
              class="question-input"
              @keypress="handleKeyPress"
              :disabled="isLoading || !isSessionReady"
            />
            <div class="button-group">
              <Button
                v-if="!hasResponse"
                type="primary"
                :loading="isLoading"
                :disabled="!question.trim() || !isSessionReady"
                @click="handleSubmit"
                class="ask-button"
                size="small"
              >
                {{ isLoading ? t('aiQuickAsk.asking') || 'Asking...' : t('aiQuickAsk.ask') || 'Ask' }}
              </Button>
              <Button
                v-if="hasResponse"
                @click="clearResponse"
                class="clear-button"
                size="small"
              >
                {{ t('aiQuickAsk.clear') || 'Clear' }}
              </Button>
            </div>
          </div>
          
          <div v-if="hasResponse" class="response-section">
            <div class="response-header">
              <span class="response-label">{{ t('aiQuickAsk.response') || 'AI Response:' }}</span>
            </div>
            <div class="response-content">
              <div class="response-text" v-html="processedResponse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>

  <!-- Desktop Version -->
  <transition name="ai-quick-ask-fade">
    <div v-if="visible && !isMobile" class="ai-quick-ask-container">
      <div class="ai-quick-ask-header" @click="toggleCollapse" :class="{ 'collapsed': isCollapsed }">
        <h4 class="ai-quick-ask-title">🤖 {{ t('aiQuickAsk.title') || 'Quick Ask AI' }}</h4>
        <div class="collapse-indicator" :class="{ 'collapsed': isCollapsed }">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
      
      <div class="ai-quick-ask-content" :class="{ 'collapsed': isCollapsed }">
        <div class="ai-quick-ask-inner">
          <div class="input-section">
            <!-- Citation Display -->
            <div v-if="citation" class="citation-display">
              <div class="citation-header">
                <span class="citation-label">📄 Citation</span>
                <button class="remove-citation" @click="removeCitation">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M9 3L3 9m0-6l6 6" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
              <div class="citation-text">{{ citation }}</div>
            </div>

            <Input.TextArea
              v-model:value="question"
              :placeholder="isSessionReady ? (t('aiQuickAsk.placeholder') || 'Ask about this report...') : 'Waiting for analysis to complete...'"
              :rows="3"
              class="question-input"
              @keypress="handleKeyPress"
              :disabled="isLoading || !isSessionReady"
            />
            <div class="button-group">
              <Button
                type="primary"
                :loading="isLoading"
                :disabled="!question.trim() || !isSessionReady"
                @click="handleSubmit"
                class="ask-button"
                size="small"
              >
                {{ isLoading ? t('aiQuickAsk.asking') || 'Asking...' : t('aiQuickAsk.ask') || 'Ask' }}
              </Button>
              <Button
                v-if="hasResponse"
                @click="clearResponse"
                class="clear-button"
                size="small"
              >
                {{ t('aiQuickAsk.clear') || 'Clear' }}
              </Button>
            </div>
          </div>
          
          <div v-if="hasResponse" class="response-section">
            <div class="response-header">
              <span class="response-label">{{ t('aiQuickAsk.response') || 'AI Response:' }}</span>
            </div>
            <div class="response-content">
              <div class="response-text" v-html="processedResponse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
@font-face {
  font-family: 'LXGW Neo ZhiSong Plus';
  src: url('../assets/fonts/LXGWNeoZhiSongPlus.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}

.ai-quick-ask-container {
  position: sticky;
  top: 100px;
  width: 280px;
  align-self: start;
  max-height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  background: #fafafa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  overflow: hidden;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
}

.ai-quick-ask-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  padding: 12px 16px;
  background: #fafafa;
  flex-shrink: 0;
  transition: background-color 0.2s ease-out, padding 0.4s linear, border-bottom-color 0.4s linear;
  border-bottom: 1px solid transparent;
}

.ai-quick-ask-header.collapsed {
  padding: 12px 16px;
  border-bottom-color: transparent;
}

.ai-quick-ask-header:hover {
  background: rgba(0, 0, 0, 0.04);
}

.ai-quick-ask-header:hover .collapse-indicator {
  color: #1890ff;
  transform: scale(1.1);
}

.ai-quick-ask-title {
  font-family: 'Playfair Display', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 14px;
  font-weight: 600;
  color: #000000;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
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

.ai-quick-ask-content {
  display: grid;
  grid-template-rows: 1fr;
  overflow: hidden;
  transition: grid-template-rows 0.25s ease, border-top-color 0.25s ease;
  border-top: 1px solid #f0f0f0;
}

.ai-quick-ask-content.collapsed {
  grid-template-rows: 0fr;
  border-top-color: transparent;
}

.ai-quick-ask-inner {
  padding: 16px;
  min-height: 0;
  opacity: 1;
  filter: blur(0);
  transition: padding 0.2s ease, opacity 0.2s ease, filter 0.2s ease;
}

.ai-quick-ask-content.collapsed .ai-quick-ask-inner {
  padding-top: 0;
  padding-bottom: 0;
  opacity: 0;
  filter: blur(4px);
}

.input-section {
  margin-bottom: 16px;
}

/* Citation Display Styles */
.citation-display {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
}

.citation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.citation-label {
  font-size: 12px;
  font-weight: 600;
  color: #666666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.remove-citation {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #999999;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.remove-citation:hover {
  background: rgba(0, 0, 0, 0.06);
  color: #000000;
}

.citation-text {
  font-size: 13px;
  line-height: 1.5;
  color: #333333;
  font-style: italic;
  border-left: 3px solid #1890ff;
  padding-left: 12px;
  margin: 0;
  max-height: 80px;
  overflow-y: auto;
}

.question-input {
  border-radius: 8px !important;
  border: 1px solid #d9d9d9 !important;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif !important;
  font-size: 14px !important;
  transition: all 0.2s ease !important;
  resize: none !important;
  background: #ffffff !important;
  margin-bottom: 12px;
}

.question-input:hover {
  border-color: #000000 !important;
}

.question-input:focus {
  border-color: #000000 !important;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1) !important;
}

.button-group {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.ask-button {
  border-radius: 8px !important;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif !important;
  font-size: 14px !important;
  font-weight: 600 !important;
  background: #000000 !important;
  border-color: #000000 !important;
  height: 36px !important;
  padding: 0 20px !important;
  transition: all 0.2s ease !important;
}

.ask-button:hover {
  background: #333333 !important;
  border-color: #333333 !important;
  transform: translateY(-1px);
}

.ask-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  color: #858585 !important;
}

.clear-button {
  border-radius: 8px !important;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif !important;
  font-size: 13px !important;
  height: 32px !important;
  padding: 0 12px !important;
  background: #ffffff !important;
  border-color: #d9d9d9 !important;
  color: #666666 !important;
  transition: all 0.2s ease !important;
}

.clear-button:hover {
  background: #f5f5f5 !important;
  border-color: #000000 !important;
  color: #000000 !important;
  transform: translateY(-1px);
}

.response-section {
  border-top: 1px solid #f0f0f0;
  padding-top: 16px;
}

.response-header {
  margin-bottom: 8px;
}

.response-label {
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 12px;
  font-weight: 600;
  color: #666666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.response-content {
  background: #fafafa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 12px;
  max-height: 300px;
  overflow-y: auto;
}

.response-text {
    font-family: 'DM Sans', 'LXGW WenKai', serif !important;

  font-size: 13px !important;
  line-height: 1.5 !important;
  color: #333333 !important;
  margin: 0 !important;
}

/* Markdown content styling */
.response-text p {
  margin: 0 0 8px 0;
  line-height: 1.6;
}

.response-text p:last-child {
  margin-bottom: 0;
}

.response-text h1, .response-text h2, .response-text h3, .response-text h4, .response-text h5, .response-text h6 {
    font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-weight: 600;
  color: #000000;
  margin: 12px 0 6px 0;
  line-height: 1.3;
}

.response-text h1 { font-size: 16px; }
.response-text h2 { font-size: 15px; }
.response-text h3 { font-size: 14px; }
.response-text h4 { font-size: 13px; }

.response-text ul, .response-text ol {
  margin: 8px 0;
  padding-left: 20px;
}

.response-text li {
  margin: 4px 0;
  line-height: 1.5;
}

.response-text blockquote {
  border-left: 3px solid #e9ecef;
  margin: 8px 0;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 0 4px 4px 0;
  font-style: italic;
}

.response-text code {
  background: #f1f3f4;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #d73a49;
}

.response-text pre {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 12px;
  margin: 8px 0;
  overflow-x: auto;
  line-height: 1.4;
}

.response-text pre code {
  background: none;
  padding: 0;
  color: #333333;
  font-size: 11px;
}

.response-text strong {
  font-weight: 600;
  color: #000000;
}

.response-text em {
  font-style: italic;
}

.response-text a {
  color: #1890ff;
  text-decoration: none;
  border-bottom: 1px dotted #1890ff;
}

.response-text a:hover {
  color: #40a9ff;
  border-bottom-color: #40a9ff;
}

/* Scrollbar styling to match other components */
.response-content::-webkit-scrollbar {
  width: 4px;
}

.response-content::-webkit-scrollbar-track {
  background: #f8f9fa;
}

.response-content::-webkit-scrollbar-thumb {
  background: #e9ecef;
  border-radius: 2px;
}

.response-content::-webkit-scrollbar-thumb:hover {
  background: #d0d0d0;
}

.ai-quick-ask-fade-enter-active,
.ai-quick-ask-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.ai-quick-ask-fade-enter-from,
.ai-quick-ask-fade-leave-to {
  opacity: 0;
  transform: translateX(10px);
}

@media (max-width: 1200px) {
  .ai-quick-ask-container {
    display: none; /* Hide desktop version on small screens */
  }
}

@media (max-width: 768px) {
  .ai-quick-ask-title {
    font-size: 13px;
  }
  
  .mobile-content .question-input {
    font-size: 16px !important; /* Prevent zoom on iOS */
  }
  
  .mobile-content .response-text {
    font-size: 12px !important;
  }
  
  .mobile-content .response-text h1 { font-size: 18px; }
  .mobile-content .response-text h2 { font-size: 16px; }
  .mobile-content .response-text h3 { font-size: 15px; }
  .mobile-content .response-text h4 { font-size: 14px; }
}

/* Mobile/Small Screen Floating Button */
.mobile-quick-ask {
  position: fixed;
  bottom: 104px; /* 32px (back-to-top bottom) + 56px (back-to-top height) + 16px (gap) */
  right: 32px; /* Match back-to-top button right position */
  z-index: 1000;
}

.mobile-floating-button {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #000000;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: white;
}

.mobile-floating-button:hover:not(:disabled) {
  background: #333333;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
}

.mobile-floating-button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.mobile-floating-button:disabled {
  background: #cccccc;
  cursor: not-allowed;
  opacity: 0.6;
}

/* Mobile Overlay */
.mobile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1500;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 20px;
}

.mobile-overlay-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.mobile-overlay-content {
  position: relative;
  width: calc(100% - 32px);
  max-width: 400px;
  background: #ffffff;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  max-height: 80vh;
  overflow: hidden;
}

.mobile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px 12px 20px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
  background: #fafafa;
  border-radius: 12px 12px 0 0;
}

.mobile-title {
  font-family: 'Playfair Display', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 16px;
  font-weight: 600;
  color: #000000;
  margin: 0;
}

.mobile-close-button {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #666666;
  border-radius: 6px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mobile-close-button:hover {
  background: rgba(0, 0, 0, 0.06);
  color: #000000;
}

.mobile-content {
  flex: 1;
  padding: 16px 20px 20px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Mobile Overlay Transitions */
.mobile-overlay-enter-active,
.mobile-overlay-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.mobile-overlay-enter-active .mobile-overlay-backdrop,
.mobile-overlay-leave-active .mobile-overlay-backdrop {
  transition: all 0.3s ease;
}

.mobile-overlay-enter-active .mobile-overlay-content,
.mobile-overlay-leave-active .mobile-overlay-content {
  transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.mobile-overlay-enter-from .mobile-overlay-backdrop,
.mobile-overlay-leave-to .mobile-overlay-backdrop {
  opacity: 0;
  backdrop-filter: blur(0px);
  -webkit-backdrop-filter: blur(0px);
}

.mobile-overlay-enter-from .mobile-overlay-content,
.mobile-overlay-leave-to .mobile-overlay-content {
  transform: translateY(-100%) scale(0.95);
  opacity: 0;
}

/* Mobile-specific adjustments for very small screens */
@media (max-width: 768px) {
  .ai-quick-ask-container {
    display: none; /* Hide desktop version on mobile */
  }
  
  .mobile-quick-ask {
    bottom: 88px; /* 24px (back-to-top bottom) + 48px (back-to-top height) + 16px (gap) */
    right: 24px; /* Match mobile back-to-top button right position */
  }
  
  .mobile-floating-button {
    width: 48px;
    height: 48px;
    font-size: 20px;
  }
  
  .mobile-content .button-group {
    flex-direction: row;
    gap: 8px;
    justify-content: flex-end;
  }
  
  .mobile-content .ask-button {
    font-size: 13px !important;
    height: 36px !important;
    padding: 0 16px !important;
    flex: 0 0 auto;
  }
  
  .mobile-content .clear-button {
    font-size: 13px !important;
    height: 36px !important;
    padding: 0 16px !important;
    flex: 0 0 auto;
  }
  
  
  .mobile-content .question-input {
    font-size: 16px !important; /* Prevent zoom on iOS */
  }
  
  .mobile-content .response-content {
    max-height: 300px;
  }
  
  .mobile-content .response-text h1 { font-size: 18px; }
  .mobile-content .response-text h2 { font-size: 16px; }
  .mobile-content .response-text h3 { font-size: 15px; }
  .mobile-content .response-text h4 { font-size: 14px; }
}

/* Desktop styles - ensure desktop version shows correctly */
@media (min-width: 1201px) {
  .mobile-quick-ask,
  .mobile-overlay {
    display: none; /* Hide mobile version on desktop */
  }
}
</style>