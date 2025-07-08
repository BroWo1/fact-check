<template>
  <div class="language-selector">
    <Select 
      v-model:value="selectedLanguage" 
      @change="changeLanguage"
      class="language-select"
      :style="{ width: '100px' }"
    >
      <Select.Option value="en">EN</Select.Option>
      <Select.Option value="zh">中文</Select.Option>
    </Select>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Select } from 'ant-design-vue'

const { locale } = useI18n()
const selectedLanguage = ref('en')

onMounted(() => {
  // Get saved language from localStorage or default to 'en'
  const savedLanguage = localStorage.getItem('language') || 'en'
  selectedLanguage.value = savedLanguage
  locale.value = savedLanguage
})

const changeLanguage = (lang) => {
  selectedLanguage.value = lang
  locale.value = lang
  localStorage.setItem('language', lang)
}
</script>

<style scoped>
.language-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.language-select {
  font-size: 14px;
}

.language-select :deep(.ant-select-selection-item) {
  font-weight: 500;
  color: #333;
}
</style>
