<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Input, Button, Typography, Space, Layout, Upload } from 'ant-design-vue'

const { Title, Paragraph } = Typography
const { Header, Content } = Layout

const inputText = ref('')
const isLoading = ref(false)
const currentExampleIndex = ref(0)
const uploadedFile = ref(null)
const imagePreview = ref('')
const isDragOver = ref(false)

const examples = ref([
  "New study shows that drinking 8 glasses of water daily can boost brain function by 30%",
  "Breaking: Scientists discover that chocolate consumption reduces risk of heart disease by 40%",
  "Report claims that electric vehicles produce more emissions than gas cars when accounting for battery production",
  "Social media post: 'Vaccines contain microchips for government tracking'",
  "News headline: Artificial intelligence will replace 50% of jobs by 2030"
])

const currentExample = ref(examples.value[0])
let rotationInterval = null

const rotateExample = () => {
  currentExampleIndex.value = (currentExampleIndex.value + 1) % examples.value.length
  currentExample.value = examples.value[currentExampleIndex.value]
}

onMounted(() => {
  rotationInterval = setInterval(rotateExample, 4000) // Rotate every 4 seconds
})

onUnmounted(() => {
  if (rotationInterval) {
    clearInterval(rotationInterval)
  }
})

const selectExample = (example) => {
  inputText.value = example
}

const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (file && file.type.startsWith('image/')) {
    uploadedFile.value = file
    
    // Create image preview
    const reader = new FileReader()
    reader.onload = (e) => {
      imagePreview.value = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

const processImageFile = (file) => {
  if (file && file.type.startsWith('image/')) {
    uploadedFile.value = file
    
    // Create image preview
    const reader = new FileReader()
    reader.onload = (e) => {
      imagePreview.value = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

const handleDragOver = (e) => {
  e.preventDefault()
  isDragOver.value = true
}

const handleDragLeave = (e) => {
  e.preventDefault()
  isDragOver.value = false
}

const handleDrop = (e) => {
  e.preventDefault()
  isDragOver.value = false
  
  const files = e.dataTransfer.files
  if (files.length > 0) {
    const file = files[0]
    processImageFile(file)
  }
}

const handlePaste = (e) => {
  const items = e.clipboardData.items
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.type.startsWith('image/')) {
      e.preventDefault()
      const file = item.getAsFile()
      processImageFile(file)
      break
    }
  }
}

const removeImage = () => {
  uploadedFile.value = null
  imagePreview.value = ''
  // Reset file input
  const fileInput = document.getElementById('photo-upload')
  if (fileInput) fileInput.value = ''
}

const triggerFileUpload = () => {
  document.getElementById('photo-upload').click()
}

const handleSubmit = () => {
  if (!inputText.value.trim() && !uploadedFile.value) return
  
  isLoading.value = true
  // TODO: Implement fact-checking logic
  console.log('Fact-checking text:', inputText.value)
  if (uploadedFile.value) {
    console.log('Fact-checking image:', uploadedFile.value.name)
  }
  
  // Simulate API call
  setTimeout(() => {
    isLoading.value = false
  }, 2000)
}

const handleKeyPress = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSubmit()
  }
}
</script>

<template>
  <Layout class="main-layout">
    <Header class="header">
      <div class="header-content">
        <div class="logo-section">
          <Title level="2" class="logo-text">
            itLooksLegit.com
          </Title>
        </div>
      </div>
    </Header>
    
    <Content class="content">
      <div class="main-container">
        <div class="hero-section">
          <Title level="1" class="main-title">
            It Looks Legit
          </Title>
          <Paragraph class="subtitle">
            ...or is it?
          </Paragraph>
        </div>
        
        <div class="input-section">
          <Space direction="vertical" size="large" class="input-container">
            <div 
              class="input-wrapper"
              :class="{ 'drag-over': isDragOver }"
              @dragover="handleDragOver"
              @dragleave="handleDragLeave"
              @drop="handleDrop"
            >
              <Input.TextArea
                v-model:value="inputText"
                placeholder="Paste your news article, social media post, or claim here to fact-check... You can also drag & drop or paste images directly here!"
                :rows="6"
                class="main-input"
                @keypress="handleKeyPress"
                @paste="handlePaste"
              />
              <div class="input-controls">
                <input
                  type="file"
                  id="photo-upload"
                  accept="image/*"
                  @change="handleFileUpload"
                  style="display: none;"
                />
                <Button 
                  class="upload-button"
                  @click="triggerFileUpload"
                  size="small"
                >
                  📷 Upload Photo
                </Button>
              </div>
              
              <!-- Drag overlay -->
              <div v-if="isDragOver" class="drag-overlay">
                <div class="drag-message">
                  📷 Drop your image here
                </div>
              </div>
              
              <!-- Image Preview -->
              <div v-if="imagePreview" class="image-preview">
                <div class="preview-header">
                  <span class="preview-title">Uploaded Image:</span>
                  <Button 
                    class="remove-button" 
                    size="small" 
                    @click="removeImage"
                  >
                    ✕
                  </Button>
                </div>
                <img :src="imagePreview" alt="Uploaded preview" class="preview-image" />
              </div>
            </div>
            
            <Button 
              type="primary" 
              size="large" 
              class="submit-button"
              :loading="isLoading"
              :disabled="!inputText.trim() && !uploadedFile"
              @click="handleSubmit"
            >
              {{ isLoading ? 'Analyzing...' : 'Fact-Check' }}
            </Button>
          </Space>
        </div>
        
        <div class="examples-section">
          <Paragraph class="examples-title">Example to try:</Paragraph>
          <div class="rotating-example">
            <div 
              class="example-card rotating" 
              @click="selectExample(currentExample)"
            >
              <div class="example-text">{{ currentExample }}</div>
            </div>
          </div>
        </div>
        
        <div class="info-section">
          <Paragraph class="info-text">
            Our AI analyzes claims against reliable sources and provides detailed verification reports
          </Paragraph>
        </div>
      </div>
    </Content>
  </Layout>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Crimson+Text:wght@400;600&display=swap');

.main-layout {
  min-height: 100vh;
  background: #ffffff;
}

.header {
  background: #ffffff;
  border-bottom: 1px solid #e0e0e0;
  padding: 0;
  height: 80px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  height: 100%;
  display: flex;
  align-items: center;
}

.logo-section {
  display: flex;
  align-items: center;
}

.logo-text {
  font-family: 'Playfair Display', serif !important;
  color: #000000 !important;
  margin: 0 !important;
  font-weight: 700 !important;
  font-size: 28px !important;
  letter-spacing: -0.5px;
}

.content {
  padding: 0;
}

.main-container {
  max-width: 700px;
  margin: 0 auto;
  padding: 60px 24px 40px;
  text-align: center;
}

.hero-section {
  margin-bottom: 40px;
}

.examples-section {
  margin-bottom: 20px;
}

.examples-title {
  font-family: 'Crimson Text', serif !important;
  font-size: 14px !important;
  color: #666666 !important;
  margin-bottom: 12px !important;
  font-weight: 500 !important;
}

.rotating-example {
  max-width: 500px;
  margin: 0 auto;
}

.example-card.rotating {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
  animation: fadeIn 0.5s ease-in-out;
}

.example-card.rotating:hover {
  background: #f5f5f5;
  border-color: #d9d9d9;
  transform: translateY(-1px);
}

.example-text {
  font-family: 'Crimson Text', serif;
  font-size: 13px;
  color: #555555;
  line-height: 1.3;
}

@keyframes fadeIn {
  from {
    opacity: 0.6;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.main-title {
  font-family: 'Playfair Display', serif !important;
  font-size: 48px !important;
  font-weight: 700 !important;
  color: #000000 !important;
  margin-bottom: 16px !important;
  letter-spacing: -1px;
  line-height: 1.2;
}

.subtitle {
  font-family: 'Crimson Text', serif !important;
  font-size: 20px !important;
  color: #666666 !important;
  max-width: 600px;
  margin: 0 auto !important;
  line-height: 1.6;
}

.input-section {
  margin-bottom: 30px;
}

.input-container {
  width: 100%;
}

.input-wrapper {
  position: relative;
  width: 100%;
  transition: all 0.3s ease;
}

.input-wrapper.drag-over {
  transform: scale(1.02);
}

.drag-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.05);
  border: 2px dashed #000000;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
  pointer-events: none;
}

.drag-message {
  font-family: 'Crimson Text', serif;
  font-size: 18px;
  color: #000000;
  font-weight: 600;
  text-align: center;
  background: rgba(255, 255, 255, 0.9);
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.input-controls {
  position: absolute;
  bottom: 12px;
  right: 12px;
  z-index: 10;
}

.upload-button {
  background: #f8f9fa !important;
  border: 1px solid #e9ecef !important;
  color: #666666 !important;
  font-family: 'Crimson Text', serif !important;
  font-size: 12px !important;
  height: 32px !important;
  border-radius: 6px !important;
  transition: all 0.2s ease !important;
}

.upload-button:hover {
  background: #e9ecef !important;
  border-color: #000000 !important;
  color: #000000 !important;
}

.image-preview {
  margin-top: 16px;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 12px;
  background: #fafafa;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.preview-title {
  font-family: 'Crimson Text', serif;
  font-size: 13px;
  color: #666666;
  font-weight: 600;
}

.remove-button {
  background: #fff !important;
  border: 1px solid #d9d9d9 !important;
  color: #999999 !important;
  font-size: 12px !important;
  height: 24px !important;
  width: 24px !important;
  border-radius: 4px !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.remove-button:hover {
  background: #f5f5f5 !important;
  border-color: #ff4d4f !important;
  color: #ff4d4f !important;
}

.preview-image {
  max-width: 100%;
  max-height: 200px;
  border-radius: 6px;
  object-fit: contain;
  display: block;
  margin: 0 auto;
}

.main-input {
  border-radius: 8px !important;
  border: 1px solid #d9d9d9 !important;
  font-family: 'Crimson Text', serif !important;
  font-size: 16px !important;
  transition: all 0.2s ease !important;
  resize: none !important;
  background: #ffffff !important;
}

.main-input:hover {
  border-color: #000000 !important;
}

.main-input:focus {
  border-color: #000000 !important;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1) !important;
}

.submit-button {
  border-radius: 8px !important;
  height: 48px !important;
  padding: 0 32px !important;
  font-family: 'Crimson Text', serif !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  background: #000000 !important;
  border-color: #000000 !important;
  transition: all 0.2s ease !important;
}

.submit-button:hover {
  background: #333333 !important;
  border-color: #333333 !important;
  transform: translateY(-1px);
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  color: #858585 !important;
}

.info-section {
  margin-top: 30px;
}

.info-text {
  font-family: 'Crimson Text', serif !important;
  color: #999999 !important;
  font-size: 16px !important;
  margin: 0 !important;
}

@media (max-width: 768px) {
  .main-title {
    font-size: 36px !important;
  }
  
  .subtitle {
    font-size: 18px !important;
  }
  
  .main-container {
    padding: 40px 16px;
  }
  
  .logo-text {
    font-size: 24px !important;
  }
  
  .examples-title {
    font-size: 13px !important;
  }
  
  .example-card.rotating {
    padding: 10px 14px;
  }
  
  .example-text {
    font-size: 12px !important;
  }
  
  .input-controls {
    bottom: 8px;
    right: 8px;
  }
  
  .upload-button {
    font-size: 11px !important;
    height: 28px !important;
  }
  
  .preview-image {
    max-height: 150px;
  }
  
  .drag-message {
    font-size: 16px !important;
    padding: 12px 20px;
  }
  
  .input-wrapper.drag-over {
    transform: scale(1.01);
  }
}
</style>
