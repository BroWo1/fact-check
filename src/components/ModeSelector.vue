<template>
  <div class="mode-selector">
    <div class="mode-toggle">
      <button 
        :class="['mode-button', { active: mode === 'fact_check' }]"
        @click="$emit('update:mode', 'fact_check')"
      >
        <span class="mode-icon">🔍</span>
        <span class="mode-text">{{ t('mode.factCheck') }}</span>
      </button>
      <button 
        :class="['mode-button', { active: mode === 'research' }]"
        @click="$emit('update:mode', 'research')"
      >
        <span class="mode-icon">📚</span>
        <span class="mode-text">{{ t('mode.research') }}</span>
      </button>
    </div>
    <p class="mode-description">
      {{ modeDescription }}
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  mode: {
    type: String,
    default: 'fact_check'
  }
})

defineEmits(['update:mode'])

const modeDescription = computed(() => {
  return props.mode === 'fact_check' 
    ? t('mode.factCheckDescription')
    : t('mode.researchDescription')
})
</script>

<style scoped>
.mode-selector {
  margin-bottom: 20px;
  text-align: center;
}

.mode-toggle {
  display: inline-flex;
  background: #f5f5f5;
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 12px;
  border: 1px solid #e8e8e8;
}

.mode-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Crimson Text', serif;
  font-size: 14px;
  font-weight: 600;
  color: #666666;
  min-width: 120px;
  justify-content: center;
}

.mode-button.active {
  background: #000000;
  color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.mode-button:hover:not(.active) {
  background: #eaeaea;
  color: #000000;
}

.mode-icon {
  font-size: 16px;
}

.mode-text {
  font-size: 14px;
}

.mode-description {
  font-family: 'Crimson Text', serif;
  font-size: 13px;
  color: #888888;
  margin: 0;
  max-width: 500px;
  margin: 0 auto;
  line-height: 1.4;
}

@media (max-width: 480px) {
  .mode-button {
    min-width: 100px;
    padding: 10px 16px;
  }
  
  .mode-text {
    font-size: 13px;
  }
  
  .mode-description {
    font-size: 12px;
  }
}
</style>
