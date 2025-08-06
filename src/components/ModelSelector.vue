<template>
  <div class="model-selector">
    <Select 
      v-model:value="selectedModel" 
      @change="changeModel"
      class="model-select"
      :style="{ width: '140px' }"
    >
      <Select.Option value="openai-gpt-4">
        <div class="model-option">
          <img
            class="openai-logo"
            height="16"
            src="https://registry.npmmirror.com/@lobehub/icons-static-png/latest/files/light/openai.png"
            alt="OpenAI"
          />
          OpenAI
        </div>
      </Select.Option>
    </Select>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Select } from 'ant-design-vue'

const selectedModel = ref('openai-gpt-4')

onMounted(() => {
  // Get saved model from localStorage or default to 'openai-gpt-4'
  const savedModel = localStorage.getItem('selectedModel') || 'openai-gpt-4'
  selectedModel.value = savedModel
})

const changeModel = (model) => {
  selectedModel.value = model
  localStorage.setItem('selectedModel', model)
  // In the future, this could emit an event or update a global store
  console.log('Model changed to:', model)
}
</script>

<style scoped>
.model-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-select {
  font-size: 14px;
}

.model-select :deep(.ant-select-selection-item) {
  font-weight: 500;
  color: #333;
}

.model-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.openai-logo {
  width: 16px;
  height: 16px;
  object-fit: contain;
  flex-shrink: 0;
}
</style>