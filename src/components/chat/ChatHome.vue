<script setup>
import { ref } from 'vue'
import { Input, Button, Typography } from 'ant-design-vue'
import { ArrowUp, Sparkles } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const emit = defineEmits(['send-message'])

const { t } = useI18n()
const { Title, Paragraph } = Typography

const inputText = ref('')

const handleSubmit = () => {
  if (!inputText.value.trim()) return
  emit('send-message', inputText.value.trim())
  inputText.value = ''
}

const handleKeyPress = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSubmit()
  }
}

const exampleQuestions = ref([
  'What is quantum computing?',
  'Explain the basics of machine learning',
  'How does blockchain technology work?',
  'What are the benefits of renewable energy?'
])

const selectExample = (example) => {
  inputText.value = example
}
</script>

<template>
  <div class="chat-home">
    <div class="chat-home-content">
      <div class="hero-section">
        <div class="hero-icon">
          <Sparkles :size="48" />
        </div>
        <Title level="1" class="hero-title">
          {{ t('chat.title') }}
        </Title>
        <Paragraph class="hero-subtitle">
          {{ t('chat.subtitle') }}
        </Paragraph>
      </div>

      <div class="input-section">
        <div class="input-wrapper">
          <Input.TextArea
            v-model:value="inputText"
            :placeholder="t('chat.placeholder')"
            :rows="4"
            class="chat-input"
            @keypress="handleKeyPress"
          />
          <div class="input-footer">
            <div class="input-hint">
              {{ t('chat.inputHint') }}
            </div>
            <Button
              type="primary"
              class="send-button"
              :disabled="!inputText.trim()"
              @click="handleSubmit"
            >
              <ArrowUp :size="16" />
            </Button>
          </div>
        </div>
      </div>

      <div class="examples-section">
        <div class="examples-title">{{ t('chat.tryAsking') }}</div>
        <div class="examples-grid">
          <div
            v-for="(example, index) in exampleQuestions"
            :key="index"
            class="example-card"
            @click="selectExample(example)"
          >
            <div class="example-icon">💬</div>
            <div class="example-text">{{ example }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-home {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.chat-home-content {
  max-width: 800px;
  width: 100%;
}

.hero-section {
  text-align: center;
  margin-bottom: 48px;
}

.hero-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 96px;
  height: 96px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 24px;
  margin-bottom: 24px;
  color: white;
  box-shadow: 0 10px 40px rgba(102, 126, 234, 0.3);
}

.hero-title {
  font-size: 48px !important;
  font-weight: 700 !important;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 16px !important;
}

.hero-subtitle {
  font-size: 18px !important;
  color: rgba(0, 0, 0, 0.6) !important;
  margin: 0 !important;
}

.input-section {
  margin-bottom: 40px;
}

.input-wrapper {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.input-wrapper:focus-within {
  border-color: #667eea;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.2);
}

.chat-input {
  border: none !important;
  padding: 0 !important;
  font-size: 16px !important;
  resize: none;
}

.chat-input:focus {
  box-shadow: none !important;
}

.input-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.input-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.send-button {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}

.send-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #7c8fef 0%, #8b5cb3 100%);
}

.send-button:disabled {
  background: rgba(0, 0, 0, 0.1);
}

.examples-section {
  text-align: center;
}

.examples-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: 20px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.examples-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.example-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  text-align: left;
}

.example-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.example-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.example-text {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.8);
  line-height: 1.5;
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 32px !important;
  }

  .hero-subtitle {
    font-size: 16px !important;
  }

  .examples-grid {
    grid-template-columns: 1fr;
  }
}
</style>
