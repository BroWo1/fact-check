<script setup>
import { ref, computed } from 'vue';
import AIQuickAsk from './AIQuickAsk.vue';
import AIPPTGenerator from './AIPPTGenerator.vue';

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

// Track collapse states
const quickAskCollapsed = ref(true);
const pptGeneratorCollapsed = ref(true);

// Computed heights for dynamic spacing
const quickAskHeight = computed(() => {
  if (!props.visible) return 0;
  // Base header height + content height when expanded
  const headerHeight = 45; // Header height
  const contentHeight = quickAskCollapsed.value ? 0 : 200; // Approximate expanded content height
  return headerHeight + contentHeight;
});


// Handle collapse state changes
const handleQuickAskCollapseChange = (collapsed) => {
  quickAskCollapsed.value = collapsed;
};

const handlePPTGeneratorCollapseChange = (collapsed) => {
  pptGeneratorCollapsed.value = collapsed;
};

// Expose citation handler for parent components
const quickAskRef = ref(null);
const handleCitation = (selectedText) => {
  if (quickAskRef.value) {
    quickAskRef.value.handleCitation(selectedText);
  }
};

defineExpose({
  handleCitation
});
</script>

<template>
  <div v-if="visible" class="ai-container">
    <AIQuickAsk
      ref="quickAskRef"
      :session-id="sessionId"
      :report-content="reportContent"
      :visible="visible"
      @collapse-changed="handleQuickAskCollapseChange"
      class="ai-container-quick-ask"
    />
    
    <AIPPTGenerator
      :session-id="sessionId"
      :report-content="reportContent"
      :visible="visible"
      :ai-quick-ask-collapsed="quickAskCollapsed"
      @collapse-changed="handlePPTGeneratorCollapseChange"
      class="ai-container-ppt-generator"
      :in-container="true"
    />
  </div>
</template>

<style scoped>
.ai-container {
  position: sticky;
  top: 100px;
  width: 280px;
  align-self: start;
  max-height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  gap: 20px;
  z-index: 99;
}

/* Override individual component positioning */
.ai-container :deep(.ai-quick-ask-container) {
  position: static !important;
  top: auto !important;
  max-height: none !important;
  margin-bottom: 0;
}

.ai-container :deep(.ai-ppt-generator-container) {
  position: static !important;
  top: auto !important;
  max-height: none !important;
  z-index: auto !important;
  /* Override any dynamic positioning */
  transform: none !important;
}

/* Hide mobile versions when inside container */
@media (max-width: 1200px) {
  .ai-container {
    display: none;
  }
}

@media (min-width: 1201px) {
  .ai-container :deep(.mobile-quick-ask),
  .ai-container :deep(.mobile-ppt-generator) {
    display: none !important;
  }
}
</style>