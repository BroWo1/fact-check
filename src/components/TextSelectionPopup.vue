<template>
  <Teleport to="body">
    <Transition name="selection-popup">
      <div
        v-if="showSelectionButton && selectedText"
        class="text-selection-popup"
        :style="{
          left: selectionPosition.x + 'px',
          top: selectionPosition.y + 'px'
        }"
      >
        <button
          class="ask-ai-button"
          @click="handleAskAI"
          :disabled="!isSessionReady"
        >
          🤖 Ask AI
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { useTextSelection } from '../composables/useTextSelection'
import { watch } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: true
  },
  isSessionReady: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['ask-ai'])

const {
  selectedText,
  selectionPosition,
  showSelectionButton,
  clearSelection
} = useTextSelection()

// Debug watcher
watch([showSelectionButton, selectedText, selectionPosition], ([show, text, pos]) => {
  console.log('TextSelectionPopup state:', { show, text, pos, visible: props.visible, isSessionReady: props.isSessionReady })
})

const handleAskAI = () => {
  console.log('Ask AI clicked with text:', selectedText.value)
  if (selectedText.value && props.isSessionReady) {
    emit('ask-ai', selectedText.value)
    clearSelection()
  }
}
</script>

<style scoped>
.text-selection-popup {
  position: absolute;
  z-index: 2000;
  transform: translateX(-50%); /* Center horizontally on the selection */
  pointer-events: auto;
  /* Add a subtle background to make it stand out */
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border-radius: 8px;
  padding: 4px;
}

.ask-ai-button {
  background: #000000;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
  /* Smaller, more compact button */
  min-height: 32px;
  min-width: 80px;
  justify-content: center;
}

.ask-ai-button:hover:not(:disabled) {
  background: #333333;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
}

.ask-ai-button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.ask-ai-button:disabled {
  background: #cccccc;
  cursor: not-allowed;
  opacity: 0.6;
}

/* Transition animations */
.selection-popup-enter-active,
.selection-popup-leave-active {
  transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.selection-popup-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-100%) scale(0.8);
}

.selection-popup-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-100%) scale(0.8);
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .ask-ai-button {
    font-size: 13px;
    padding: 8px 12px;
    min-height: 40px;
    min-width: 90px;
    /* Prevent zoom on iOS */
    touch-action: manipulation;
  }
  
  .text-selection-popup {
    /* Ensure it's above mobile browser UI */
    z-index: 9999;
    /* Keep centered on mobile too */
    transform: translateX(-50%);
  }
}
</style>