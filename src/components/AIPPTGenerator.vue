<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { Button, message, Modal } from 'ant-design-vue';
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
  },
  aiQuickAskCollapsed: {
    type: Boolean,
    default: true
  },
  inContainer: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['collapse-changed']);

const isGenerating = ref(false);
const isCollapsed = ref(true);
const savedPPT = ref(null);
const showPPTModal = ref(false);
const currentSlideIndex = ref(0);
const showHTMLCode = ref(false);
const currentSlideHTML = ref('');
const isEditMode = ref(false);
const editableSlideContent = ref('');
const selectedElement = ref(null);
const editingText = ref('');
const showTextEditor = ref(false);
const editorPosition = ref({ x: 0, y: 0 });
const textEditorInput = ref(null);
const slideContainerRef = ref(null);
const slideIframeRef = ref(null);
const visualEditContainer = ref(null);
const editModeIframe = ref(null);

// PPT generation progress tracking
const generationProgress = ref({
  current: 0,
  total: 0,
  currentTask: '',
  failedSlides: [],
  isComplete: false
});

// Mobile/small screen specific state
const isMobile = ref(false);
const isMobileOverlayOpen = ref(false);

const isSessionReady = computed(() => !!props.sessionId);

// Dynamic thumbnail sidebar width based on modal size and slide count
const thumbnailSidebarWidth = computed(() => {
  if (!savedPPT.value) return '200px';
  const slideCount = savedPPT.value.slides.length;
  // Base width, with adjustment for slide count
  const baseWidth = 200;
  const minWidth = 180;
  const maxWidth = 280;
  // Adjust width based on slide count (more slides = slightly wider sidebar)
  const adjustedWidth = baseWidth + Math.min(slideCount * 3, 40);
  return Math.min(Math.max(adjustedWidth, minWidth), maxWidth) + 'px';
});

// Compute dynamic top position based on AIQuickAsk state (only when not in container)
const dynamicTopPosition = computed(() => {
  if (props.inContainer) return 'auto';
  // When AIQuickAsk is collapsed, use standard 160px
  // When expanded, move further down to accommodate the expanded AIQuickAsk
  return props.aiQuickAskCollapsed ? '160px' : '335px';
});

// Compute dynamic max-height based on top position (only when not in container)
const dynamicMaxHeight = computed(() => {
  if (props.inContainer) return 'none';
  const topValue = props.aiQuickAskCollapsed ? 160 : 335;
  return `calc(100vh - ${topValue + 20}px)`;
});

const toggleCollapse = () => {
  if (isMobile.value) {
    isMobileOverlayOpen.value = !isMobileOverlayOpen.value;
  } else {
    isCollapsed.value = !isCollapsed.value;
    // Emit the collapse state change for desktop
    emit('collapse-changed', isCollapsed.value);
  }
};

const closeMobileOverlay = () => {
  isMobileOverlayOpen.value = false;
};

// Check if mobile/small screen for responsive behavior
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 1200;
};

// Scale the fixed-size 1280x720 slide inside the iframe to fit its container
const fitSlide = () => {
  const W = 1280, H = 720;
  const c = slideContainerRef.value;
  const f = slideIframeRef.value;
  if (!c || !f) return;
  const scale = Math.min(c.clientWidth / W, c.clientHeight / H);
  f.style.width = W + 'px';
  f.style.height = H + 'px';
  // Center the iframe
  f.style.transformOrigin = 'center center';
  f.style.position = 'absolute';
  f.style.top = '50%';
  f.style.left = '50%';
  f.style.transform = `translate(-50%, -50%) scale(${scale})`;
};

// Scale edit mode iframe similarly
const fitEditSlide = () => {
  const W = 1280, H = 720;
  const c = visualEditContainer.value;
  const f = editModeIframe.value;
  if (!c || !f) return;
  const scale = Math.min(c.clientWidth / W, c.clientHeight / H);
  f.style.width = W + 'px';
  f.style.height = H + 'px';
  // Center the iframe
  f.style.transformOrigin = 'center center';
  f.style.position = 'absolute';
  f.style.top = '50%';
  f.style.left = '50%';
  f.style.transform = `translate(-50%, -50%) scale(${scale})`;
};

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile);
  loadSavedPPT();
  // Emit initial collapse state
  emit('collapse-changed', isCollapsed.value);
  nextTick(fitSlide);
  window.addEventListener('resize', fitSlide);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
  window.removeEventListener('resize', fitSlide);
});

watch(showPPTModal, (open) => {
  if (open) nextTick(fitSlide);
});
watch(currentSlideIndex, () => nextTick(fitSlide));
watch(isEditMode, (editing) => {
  if (editing) nextTick(fitEditSlide);
});

// Load saved PPT from localStorage
const loadSavedPPT = () => {
  const saved = localStorage.getItem(`ppt_${props.sessionId}`);
  if (saved) {
    try {
      savedPPT.value = JSON.parse(saved);
    } catch (error) {
      console.error('Failed to load saved PPT:', error);
    }
  }
};

// Save PPT to localStorage
const savePPT = (pptData) => {
  localStorage.setItem(`ppt_${props.sessionId}`, JSON.stringify(pptData));
  savedPPT.value = pptData;
};

const generatePPT = async () => {
  if (!props.sessionId) {
    message.error('No active session found. Please wait for the analysis to complete.');
    return;
  }

  isGenerating.value = true;

  // Reset progress tracking
  generationProgress.value = {
    current: 0,
    total: 0,
    currentTask: 'Preparing...',
    failedSlides: [],
    isComplete: false
  };

  try {
    // Step 1: Generate outline
    generationProgress.value.currentTask = 'Generating outline...';
    const outlineResult = await factCheckService.generatePPTOutline(props.sessionId, {
      reportContent: props.reportContent,
      slideCount: 7,
      theme: 'professional'
    });

    if (!outlineResult.success) {
      throw new Error(outlineResult.error?.message || 'Failed to generate PPT outline');
    }

    const { pptId, outline } = outlineResult.data;
    generationProgress.value.total = outline.length;

    // Step 2: Generate slides one by one with enhanced retry logic
    const slides = [];
    const failedSlides = [];

    for (let i = 0; i < outline.length; i++) {
      const slideInfo = outline[i];
      generationProgress.value.current = i;
      generationProgress.value.currentTask = `Generating slide ${i + 1}: ${slideInfo.title}`;

      let slideResult = null;
      let attempts = 0;
      const maxAttempts = 3; // Increased retry attempts

      while (attempts < maxAttempts && !slideResult) {
        try {
          attempts++;
          if (attempts > 1) {
            generationProgress.value.currentTask = `Retrying slide ${i + 1}: ${slideInfo.title} (attempt ${attempts}/${maxAttempts})`;
          }

          const result = await factCheckService.generateSingleSlide(props.sessionId, {
            slide_info: slideInfo,
            report_content: props.reportContent,
            theme: 'professional'
          });

          if (result.success) {
            slideResult = result.data;
            // Ensure slide has proper index for ordering
            slideResult.index = i;
            slideResult.slideId = slideInfo.id;
          } else {
            console.error(`Failed to generate slide ${slideInfo.id} (attempt ${attempts}):`, result.error);
            // Wait before retrying
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        } catch (slideError) {
          console.error(`Error generating slide ${slideInfo.id} (attempt ${attempts}):`, slideError);
          // Wait before retrying
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      if (slideResult) {
        slides.push(slideResult);
        generationProgress.value.current = i + 1;
      } else {
        // Track failed slide with complete info for regeneration
        failedSlides.push({
          id: slideInfo.id,
          title: slideInfo.title,
          description: slideInfo.description || '',
          index: i,
          slideInfo: slideInfo // Keep original slide info for regeneration
        });
        generationProgress.value.failedSlides = failedSlides;
      }
    }

    // Update progress to show completion
    generationProgress.value.current = generationProgress.value.total;
    generationProgress.value.isComplete = true;

    if (slides.length === 0) {
      throw new Error('No slides were generated successfully');
    }

    // Step 3: Save the completed PPT
    const pptData = {
      pptId,
      title: 'Analysis Report Presentation',
      createdAt: outlineResult.data.createdAt || new Date().toISOString(),
      slides: slides.sort((a, b) => a.index - b.index), // Ensure proper ordering
      failedSlides: failedSlides,
      totalSlides: outline.length
    };

    savePPT(pptData);

    if (failedSlides.length > 0) {
      message.warning(`PPT generated with ${slides.length}/${outline.length} slides. ${failedSlides.length} slides failed - you can regenerate them individually.`);
    } else {
      message.success(`PPT generated successfully with ${slides.length} slides!`);
    }

  } catch (error) {
    console.error('PPT generation failed:', error);
    message.error(error.message || 'Failed to generate PPT');
    generationProgress.value.isComplete = true;
  } finally {
    isGenerating.value = false;
    // Keep progress visible for a bit longer to show completion
    setTimeout(() => {
      generationProgress.value = {
        current: 0,
        total: 0,
        currentTask: '',
        failedSlides: [],
        isComplete: false
      };
    }, 3000);
  }
};

const generatePPTStepByStep = async () => {
  if (!props.sessionId) {
    message.error('No active session found. Please wait for the analysis to complete.');
    return;
  }

  isGenerating.value = true;

  try {
    // Step 1: Generate outline
    message.info('Generating PPT outline...');
    const outlineResult = await factCheckService.generatePPTOutline(props.sessionId, {
      reportContent: props.reportContent,
      slideCount: 7,
      theme: 'professional'
    });

    if (!outlineResult.success) {
      throw new Error(outlineResult.error?.message || 'Failed to generate PPT outline');
    }

    const { pptId, outline } = outlineResult.data;
    message.success('PPT outline generated! Now generating slides...');

    // Step 2: Generate slides one by one
    const slides = [];
    for (let i = 0; i < outline.length; i++) {
      const slideInfo = outline[i];
      message.info(`Generating slide ${i + 1} of ${outline.length}...`);

      try {
        const slideResult = await factCheckService.generateSingleSlide(props.sessionId, {
          slide_info: slideInfo,
          report_content: props.reportContent,
          theme: 'professional'
        });

        if (slideResult.success) {
          slides.push(slideResult.data);
        } else {
          console.error(`Failed to generate slide ${slideInfo.id}:`, slideResult.error);
          message.warning(`Slide ${slideInfo.id} generation failed, continuing with others...`);
        }
      } catch (slideError) {
        console.error(`Error generating slide ${slideInfo.id}:`, slideError);
        message.warning(`Slide ${slideInfo.id} generation failed, continuing with others...`);
      }
    }

    if (slides.length === 0) {
      throw new Error('No slides were generated successfully');
    }

    // Step 3: Save the completed PPT
    const pptData = {
      pptId,
      title: 'Analysis Report Presentation (Step-by-Step)',
      createdAt: outlineResult.data.createdAt || new Date().toISOString(),
      slides: slides
    };

    savePPT(pptData);
    message.success(`PPT generated successfully with ${slides.length} slides!`);

  } catch (error) {
    console.error('Step-by-step PPT generation failed:', error);
    message.error(error.message || 'Failed to generate PPT step-by-step');
  } finally {
    isGenerating.value = false;
  }
};

const openPPTModal = () => {
  if (savedPPT.value) {
    showPPTModal.value = true;
    currentSlideIndex.value = 0;
  }
};

const closePPTModal = () => {
  showPPTModal.value = false;
};

const goToSlide = (index) => {
  currentSlideIndex.value = index;
};

const nextSlide = () => {
  if (currentSlideIndex.value < savedPPT.value.slides.length - 1) {
    currentSlideIndex.value++;
  }
};

const prevSlide = () => {
  if (currentSlideIndex.value > 0) {
    currentSlideIndex.value--;
  }
};

const clearPPT = () => {
  localStorage.removeItem(`ppt_${props.sessionId}`);
  savedPPT.value = null;
  message.success('PPT cleared');
};

const toggleHTMLCode = () => {
  if (savedPPT.value && savedPPT.value.slides[currentSlideIndex.value]) {
    currentSlideHTML.value = savedPPT.value.slides[currentSlideIndex.value].content;
    showHTMLCode.value = !showHTMLCode.value;
  }
};

const copyHTMLCode = () => {
  navigator.clipboard.writeText(currentSlideHTML.value).then(() => {
    message.success('HTML code copied to clipboard');
  }).catch(() => {
    message.error('Failed to copy HTML code');
  });
};

const toggleEditMode = () => {
  if (savedPPT.value && savedPPT.value.slides[currentSlideIndex.value]) {
    if (!isEditMode.value) {
      editableSlideContent.value = savedPPT.value.slides[currentSlideIndex.value].content;
    } else {
      // Clean up edit mode
      selectedElement.value = null;
      showTextEditor.value = false;
    }
    isEditMode.value = !isEditMode.value;
  }
};

const setupEditMode = () => {
  console.log('setupEditMode called, isEditMode:', isEditMode.value);
  if (!isEditMode.value) return;
  
  // Scale the edit iframe first
  nextTick(() => {
    fitEditSlide();
  });
  
  const iframe = editModeIframe.value;
  if (!iframe) {
    console.log('No iframe found');
    return;
  }
  console.log('Iframe found, setting up edit mode');
  const checkAndSetup = () => {
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      if (!iframeDoc || !iframeDoc.body) {
        setTimeout(checkAndSetup, 100);
        return;
      }
      // Inject edit mode styles
      const style = iframeDoc.createElement('style');
      style.textContent = `
        .edit-mode-element {
          position: relative !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
        }
        .edit-mode-element:hover {
          outline: 2px dashed #000000 !important;
          background-color: rgba(0, 0, 0, 0.1) !important;
        }
        .edit-mode-element.selected {
          outline: 2px solid #000000 !important;
          background-color: rgba(0, 0, 0, 0.1) !important;
        }
        .edit-mode-overlay {
          position: absolute;
          top: -20px;
          left: 0;
          background: #000000;
          color: white;
          padding: 2px 8px;
          font-size: 11px;
          border-radius: 3px;
          pointer-events: none;
          z-index: 1000;
        }
      `;
      iframeDoc.head.appendChild(style);
      // Only allow text elements to be editable (no divs)
      const editableElements = iframeDoc.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, span, div');
      console.log('Found', editableElements.length, 'potential editable elements');
      editableElements.forEach(el => {
        if (el.textContent.trim() && !el.querySelector('h1, h2, h3, h4, h5, h6, p, li, span, div')) {
          el.classList.add('edit-mode-element');
          el.addEventListener('mouseenter', () => {
            if (!el.querySelector('.edit-mode-overlay')) {
              const overlay = iframeDoc.createElement('div');
              overlay.className = 'edit-mode-overlay';
              overlay.textContent = el.tagName.toLowerCase();
              el.style.position = 'relative';
              el.appendChild(overlay);
            }
          });
          el.addEventListener('mouseleave', () => {
            const overlay = el.querySelector('.edit-mode-overlay');
            if (overlay) overlay.remove();
          });
          el.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Element clicked:', el.tagName, el.textContent);
            // Remove previous selection
            const prevSelected = iframeDoc.querySelector('.selected');
            if (prevSelected) prevSelected.classList.remove('selected');
            // Select current element
            el.classList.add('selected');
            selectedElement.value = el;
            editingText.value = el.textContent.trim();
            console.log('Setting editingText to:', editingText.value);
            // Get the modal container for positioning
            const modalContent = document.querySelector('.ppt-modal-content');
            const rect = el.getBoundingClientRect();
            const containerRect = modalContent ? modalContent.getBoundingClientRect() : { left: 0, top: 0 };
            editorPosition.value = {
              x: containerRect.left + rect.left + (rect.width / 2) - 150, // Center horizontally
              y: containerRect.top + rect.bottom + 10
            };
            console.log('Editor position:', editorPosition.value);
            showTextEditor.value = true;
            // Focus the textarea after it's rendered
            setTimeout(() => {
              const textInput = textEditorInput.value;
              if (textInput) {
                textInput.focus();
                textInput.select();
                console.log('Textarea focused and selected');
              } else {
                console.log('textEditorInput.value is null');
              }
            }, 100);
          });
        }
      });
    } catch (error) {
      console.error('Error setting up edit mode:', error);
    }
  };
  checkAndSetup();
};

const saveTextEdit = () => {
  if (selectedElement.value && editingText.value !== undefined) {
    selectedElement.value.textContent = editingText.value;

    // Update the slide content
    const iframe = document.querySelector('.edit-mode-iframe');
    if (iframe) {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (iframeDoc && iframeDoc.body) {
          // Clone the body content and clean up edit-mode artifacts
          const bodyClone = iframeDoc.body.cloneNode(true);

          // Remove edit-mode classes and overlays
          const editElements = bodyClone.querySelectorAll('.edit-mode-element');
          editElements.forEach(el => {
            el.classList.remove('edit-mode-element', 'selected');
            // Remove edit-mode overlays
            const overlay = el.querySelector('.edit-mode-overlay');
            if (overlay) overlay.remove();
          });

          // Get the cleaned content
          const cleanedContent = bodyClone.innerHTML;

          // Check if content already has the wrapper div with proper styling
          const hasWrapper = cleanedContent.includes('style="padding: 40px; font-family: Arial, sans-serif;"');

          let updatedHTML;
          if (hasWrapper) {
            // Content already has wrapper, use as-is
            updatedHTML = cleanedContent;
          } else {
            // Content needs wrapper
            updatedHTML = `<div style="padding: 40px; font-family: Arial, sans-serif;">${cleanedContent}</div>`;
          }

          // Update the slide content and save
          savedPPT.value.slides[currentSlideIndex.value].content = updatedHTML;
          savePPT(savedPPT.value);

          // Force reactivity update
          editableSlideContent.value = '';
          setTimeout(() => {
            editableSlideContent.value = updatedHTML;
          }, 10);
        }
      } catch (error) {
        console.error('Error updating slide content:', error);
      }
    }

    selectedElement.value.classList.remove('selected');
    selectedElement.value = null;
    showTextEditor.value = false;
    message.success('Text updated successfully');
  }
};

const cancelTextEdit = () => {
  if (selectedElement.value) {
    selectedElement.value.classList.remove('selected');
  }
  selectedElement.value = null;
  showTextEditor.value = false;
  editingText.value = '';
};

const saveSlideChanges = () => {
  if (savedPPT.value && savedPPT.value.slides[currentSlideIndex.value]) {
    savePPT(savedPPT.value);
    isEditMode.value = false;
    message.success('Slide updated successfully');
  }
};

const cancelSlideEdit = () => {
  isEditMode.value = false;
  editableSlideContent.value = '';
  selectedElement.value = null;
  showTextEditor.value = false;
};

const regenerateAllFailedSlides = async () => {
  if (!props.sessionId || !savedPPT.value?.failedSlides?.length) {
    return;
  }

  isGenerating.value = true;

  // Reset progress for regeneration
  generationProgress.value = {
    current: 0,
    total: savedPPT.value.failedSlides.length,
    currentTask: 'Regenerating failed slides...',
    failedSlides: [...savedPPT.value.failedSlides],
    isComplete: false
  };

  const remainingFailedSlides = [];
  let successCount = 0;

  try {
    for (let i = 0; i < savedPPT.value.failedSlides.length; i++) {
      const failedSlide = savedPPT.value.failedSlides[i];
      generationProgress.value.current = i + 1;
      generationProgress.value.currentTask = `Regenerating slide ${i + 1}/${savedPPT.value.failedSlides.length}: ${failedSlide.title}`;

      try {
        const slideInfo = failedSlide.slideInfo || {
          id: failedSlide.id,
          title: failedSlide.title,
          description: failedSlide.description || ''
        };

        const result = await factCheckService.generateSingleSlide(props.sessionId, {
          slide_info: slideInfo,
          report_content: props.reportContent,
          theme: 'professional'
        });

        if (result.success) {
          // Update the saved PPT with the new slide
          const currentPPT = { ...savedPPT.value };
          const newSlide = { ...result.data, index: failedSlide.index, slideId: failedSlide.id };

          // Find if there's already a slide at this position and replace it, or insert at correct position
          const existingSlideIndex = currentPPT.slides.findIndex(slide => slide.index === failedSlide.index);

          if (existingSlideIndex !== -1) {
            currentPPT.slides[existingSlideIndex] = newSlide;
          } else {
            currentPPT.slides.push(newSlide);
            currentPPT.slides.sort((a, b) => a.index - b.index);
          }

          savedPPT.value = currentPPT;
          successCount++;
        } else {
          remainingFailedSlides.push(failedSlide);
        }
      } catch (error) {
        console.error(`Failed to regenerate slide ${failedSlide.id}:`, error);
        remainingFailedSlides.push(failedSlide);
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Update the PPT with remaining failed slides
    const finalPPT = { ...savedPPT.value };
    finalPPT.failedSlides = remainingFailedSlides;
    savePPT(finalPPT);

    // Update progress
    generationProgress.value.failedSlides = remainingFailedSlides;
    generationProgress.value.isComplete = true;

    if (remainingFailedSlides.length === 0) {
      message.success(`All ${successCount} failed slides regenerated successfully!`);
    } else {
      message.warning(`${successCount} slides regenerated, ${remainingFailedSlides.length} still failed.`);
    }

  } catch (error) {
    console.error('Bulk regeneration failed:', error);
    message.error('Failed to regenerate slides: ' + error.message);
  } finally {
    isGenerating.value = false;
    // Keep progress visible for a bit longer
    setTimeout(() => {
      generationProgress.value = {
        current: 0,
        total: 0,
        currentTask: '',
        failedSlides: [],
        isComplete: false
      };
    }, 3000);
  }
};

const regenerateFailedSlide = async (failedSlide) => {
  if (!props.sessionId) {
    message.error('No active session found.');
    return;
  }

  // Set loading state for this specific slide
  const slideLoadingKey = `slide_${failedSlide.id}`;
  isGenerating.value = true;

  try {
    message.info(`Regenerating slide: ${failedSlide.title}`);

    // Use the original slide info if available, otherwise reconstruct
    const slideInfo = failedSlide.slideInfo || {
      id: failedSlide.id,
      title: failedSlide.title,
      description: failedSlide.description || ''
    };

    const result = await factCheckService.generateSingleSlide(props.sessionId, {
      slide_info: slideInfo,
      report_content: props.reportContent,
      theme: 'professional'
    });

    if (result.success) {
      // Update the saved PPT with the new slide
      const currentPPT = { ...savedPPT.value };
      const newSlide = { ...result.data, index: failedSlide.index, slideId: failedSlide.id };

      // Find if there's already a slide at this position and replace it, or insert at correct position
      const existingSlideIndex = currentPPT.slides.findIndex(slide => slide.index === failedSlide.index);

      if (existingSlideIndex !== -1) {
        // Replace existing slide
        currentPPT.slides[existingSlideIndex] = newSlide;
      } else {
        // Insert at correct position
        currentPPT.slides.push(newSlide);
        currentPPT.slides.sort((a, b) => a.index - b.index);
      }

      // Remove this slide from failed slides list
      if (currentPPT.failedSlides) {
        currentPPT.failedSlides = currentPPT.failedSlides.filter(slide => slide.id !== failedSlide.id);
      }

      savePPT(currentPPT);
      message.success(`Slide "${failedSlide.title}" regenerated successfully!`);

      // If no more failed slides, show completion message
      if (currentPPT.failedSlides.length === 0) {
        message.success(`All slides generated successfully! PPT now has ${currentPPT.slides.length} slides.`);
      }
    } else {
      throw new Error(result.error?.message || 'Failed to regenerate slide');
    }
  } catch (error) {
    console.error('Slide regeneration failed:', error);
    message.error(`Failed to regenerate "${failedSlide.title}": ${error.message || 'Unknown error'}`);
  } finally {
    isGenerating.value = false;
  }
};
</script>

<template>
  <!-- Mobile/Small Screen Floating Button -->
  <div v-if="visible && isMobile" class="mobile-ppt-generator">
    <button
      class="mobile-floating-button"
      @click="toggleCollapse"
      :disabled="!isSessionReady"
    >
      📊
    </button>
  </div>

  <!-- Mobile Overlay -->
  <transition name="mobile-overlay">
    <div v-if="isMobile && isMobileOverlayOpen" class="mobile-overlay">
      <div class="mobile-overlay-backdrop" @click="closeMobileOverlay"></div>
      <div class="mobile-overlay-content">
        <div class="mobile-header">
          <h4 class="mobile-title">📊 {{ t('aiPPT.title') || 'AI PPT Generator' }}</h4>
          <button class="mobile-close-button" @click="closeMobileOverlay">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M12 4l-8 8m0-8l8 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>

        <div class="mobile-content">
          <div class="ppt-section">
            <!-- Saved PPT Card -->
            <div v-if="savedPPT" class="ppt-card" @click="openPPTModal">
              <div class="ppt-card-header">
                <h5 class="ppt-card-title">{{ savedPPT.title }}</h5>
                <span class="ppt-card-slides">{{ savedPPT.slides.length }} slides</span>
              </div>
              <div class="ppt-card-meta">
                Created {{ new Date(savedPPT.createdAt).toLocaleDateString() }}
              </div>
            </div>

            <!-- Progress Bar -->
            <div v-if="isGenerating || generationProgress.isComplete" class="progress-section">
              <div class="progress-header">
                <span class="progress-text">
                  {{ generationProgress.isComplete ? 'Generation Complete!' : generationProgress.currentTask }}
                </span>
                <span class="progress-count">{{ generationProgress.current }}/{{ generationProgress.total }}</span>
              </div>
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :class="{ 'complete': generationProgress.isComplete }"
                  :style="{ width: `${generationProgress.total > 0 ? (generationProgress.current / generationProgress.total) * 100 : 0}%` }"
                ></div>
              </div>
              <div v-if="generationProgress.isComplete" class="progress-status">
                <span class="status-icon">✅</span>
                <span class="status-text">
                  {{ generationProgress.failedSlides.length === 0 ? 'All slides generated successfully!' : `${generationProgress.current - generationProgress.failedSlides.length} slides completed, ${generationProgress.failedSlides.length} failed` }}
                </span>
              </div>
            </div>

            <!-- Failed Slides Section -->
            <div v-if="savedPPT && savedPPT.failedSlides && savedPPT.failedSlides.length > 0" class="failed-slides-section">
              <div class="failed-slides-header">
                <h5 class="failed-slides-title">Failed Slides ({{ savedPPT.failedSlides.length }})</h5>
                <Button
                  size="small"
                  @click="regenerateAllFailedSlides"
                  :loading="isGenerating"
                  class="retry-all-button"
                  type="primary"
                >
                  Retry All
                </Button>
              </div>
              <div class="failed-slides-list">
                <div v-for="failedSlide in savedPPT.failedSlides" :key="failedSlide.id" class="failed-slide-item">
                  <span class="failed-slide-title">{{ failedSlide.title }}</span>
                  <Button
                    size="small"
                    @click="regenerateFailedSlide(failedSlide)"
                    :loading="isGenerating"
                    class="regenerate-button"
                  >
                    Retry
                  </Button>
                </div>
              </div>
            </div>

            <!-- Generate Button -->
            <div class="button-group">
              <Button
                type="primary"
                :loading="isGenerating"
                :disabled="!isSessionReady"
                @click="generatePPT"
                class="generate-button"
                size="small"
              >
                {{ isGenerating ? (generationProgress.currentTask || 'Generating...') : (savedPPT ? 'Regenerate PPT' : 'Generate PPT') }}
              </Button>
              <Button
                v-if="savedPPT"
                @click="clearPPT"
                class="clear-button"
                size="small"
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>

  <!-- Desktop Version -->
  <transition name="ai-ppt-generator-fade">
    <div v-if="visible && !isMobile" class="ai-ppt-generator-container" :style="{ top: dynamicTopPosition, maxHeight: dynamicMaxHeight }">
      <div class="ai-ppt-generator-header" @click="toggleCollapse" :class="{ 'collapsed': isCollapsed }">
        <h4 class="ai-ppt-generator-title">📊 {{ t('aiPPT.title') || 'AI PPT Generator' }}</h4>
        <div class="collapse-indicator" :class="{ 'collapsed': isCollapsed }">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>

      <div class="ai-ppt-generator-content" :class="{ 'collapsed': isCollapsed }">
        <div class="ai-ppt-generator-inner">
          <div class="ppt-section">
            <!-- Saved PPT Card -->
            <div v-if="savedPPT" class="ppt-card" @click="openPPTModal">
              <div class="ppt-card-header">
                <h5 class="ppt-card-title">{{ savedPPT.title }}</h5>
                <span class="ppt-card-slides">{{ savedPPT.slides.length }} slides</span>
              </div>
              <div class="ppt-card-meta">
                Created {{ new Date(savedPPT.createdAt).toLocaleDateString() }}
              </div>
            </div>

            <!-- Progress Bar -->
            <div v-if="isGenerating || generationProgress.isComplete" class="progress-section">
              <div class="progress-header">
                <span class="progress-text">
                  {{ generationProgress.isComplete ? 'Generation Complete!' : generationProgress.currentTask }}
                </span>
                <span class="progress-count">{{ generationProgress.current }}/{{ generationProgress.total }}</span>
              </div>
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :class="{ 'complete': generationProgress.isComplete }"
                  :style="{ width: `${generationProgress.total > 0 ? (generationProgress.current / generationProgress.total) * 100 : 0}%` }"
                ></div>
              </div>
              <div v-if="generationProgress.isComplete" class="progress-status">
                <span class="status-icon">✅</span>
                <span class="status-text">
                  {{ generationProgress.failedSlides.length === 0 ? 'All slides generated successfully!' : `${generationProgress.current - generationProgress.failedSlides.length} slides completed, ${generationProgress.failedSlides.length} failed` }}
                </span>
              </div>
            </div>

            <!-- Failed Slides Section -->
            <div v-if="savedPPT && savedPPT.failedSlides && savedPPT.failedSlides.length > 0" class="failed-slides-section">
              <div class="failed-slides-header">
                <h5 class="failed-slides-title">Failed Slides ({{ savedPPT.failedSlides.length }})</h5>
                <Button
                  size="small"
                  @click="regenerateAllFailedSlides"
                  :loading="isGenerating"
                  class="retry-all-button"
                  type="primary"
                >
                  Retry All
                </Button>
              </div>
              <div class="failed-slides-list">
                <div v-for="failedSlide in savedPPT.failedSlides" :key="failedSlide.id" class="failed-slide-item">
                  <span class="failed-slide-title">{{ failedSlide.title }}</span>
                  <Button
                    size="small"
                    @click="regenerateFailedSlide(failedSlide)"
                    :loading="isGenerating"
                    class="regenerate-button"
                  >
                    Retry
                  </Button>
                </div>
              </div>
            </div>

            <!-- Generate Button -->
            <div class="button-group">
              <Button
                type="primary"
                :loading="isGenerating"
                :disabled="!isSessionReady"
                @click="generatePPT"
                class="generate-button"
                size="small"
              >
                {{ isGenerating ? (generationProgress.currentTask || 'Generating...') : (savedPPT ? 'Regenerate PPT' : 'Generate PPT') }}
              </Button>
              <Button
                v-if="savedPPT"
                @click="clearPPT"
                class="clear-button"
                size="small"
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>

  <!-- PPT Preview Modal -->
  <Modal
    v-model:open="showPPTModal"
    :width="'90vw'"
    :style="{ top: '20px' }"
    :bodyStyle="{ padding: 0, height: '85vh', display: 'flex', flexDirection: 'column' }"
    :footer="null"
    :closable="false"
    class="ppt-modal"
    @cancel="closePPTModal"
  >
    <div v-if="savedPPT" class="ppt-modal-content">
      <!-- Header -->
      <div class="ppt-modal-header">
        <h3 class="ppt-modal-title">{{ savedPPT.title }}</h3>
        <div class="ppt-modal-controls">
          <span class="slide-counter">
            {{ currentSlideIndex + 1 }} / {{ savedPPT.slides.length }}
          </span>
          <div class="modal-buttons">
            <button @click="toggleEditMode" class="edit-button" :class="{ 'active': isEditMode }" v-if="!showHTMLCode">
              {{ isEditMode ? 'Exit Edit' : 'Edit Slide' }}
            </button>
            <button @click="toggleHTMLCode" class="html-code-button" :class="{ 'active': showHTMLCode }" v-if="!isEditMode">
              {{ showHTMLCode ? 'Hide HTML' : 'Show HTML' }}
            </button>
            <button @click="closePPTModal" class="close-modal-button">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M15 5l-10 10m0-10l10 10" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div class="ppt-modal-body">
        <!-- Thumbnails Sidebar -->
        <div class="thumbnails-sidebar" :style="{ width: thumbnailSidebarWidth }">
          <div class="thumbnails-list">
            <div
              v-for="(slide, index) in savedPPT.slides"
              :key="slide.id"
              class="thumbnail-item"
              :class="{ 'active': index === currentSlideIndex }"
              @click="goToSlide(index)"
            >
              <div class="thumbnail-preview">
                <iframe
                  :srcdoc="slide.content"
                  class="thumbnail-iframe"
                  frameborder="0"
                  scrolling="no"
                ></iframe>
                <div class="thumbnail-overlay">
                  <div class="thumbnail-number">{{ index + 1 }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Slide View -->
        <div class="slide-viewer">
          <div v-if="!showHTMLCode" class="slide-navigation">
            <button
              @click="prevSlide"
              :disabled="currentSlideIndex === 0"
              class="nav-button prev-button"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M10 12l-4-4 4-4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button
              @click="nextSlide"
              :disabled="currentSlideIndex === savedPPT.slides.length - 1"
              class="nav-button next-button"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>

          <div v-if="!showHTMLCode && !isEditMode" class="slide-container" ref="slideContainerRef">
            <iframe
              v-if="savedPPT.slides[currentSlideIndex]"
              :srcdoc="savedPPT.slides[currentSlideIndex].content"
              class="slide-iframe"
              ref="slideIframeRef"
              frameborder="0"
              scrolling="no"
              @load="fitSlide"
            ></iframe>
          </div>

          <!-- Visual Edit Mode -->
          <div v-if="isEditMode && !showHTMLCode" class="visual-edit-container">
            <div class="edit-header">
              <h4>Visual Edit Mode - Slide {{ currentSlideIndex + 1 }}</h4>
              <div class="edit-actions">
                <button @click="saveSlideChanges" class="save-button">
                  💾 Save Changes
                </button>
                <button @click="cancelSlideEdit" class="cancel-edit-button">
                  ✕ Exit Edit
                </button>
              </div>
            </div>
            <div class="edit-instructions-bar">
              <span class="edit-instruction">🔍 Hover over text elements to highlight them, then click to edit</span>
            </div>
            <div class="visual-edit-content" ref="visualEditContainer">
              <iframe
                v-if="savedPPT.slides[currentSlideIndex]"
                :srcdoc="editableSlideContent"
                class="edit-mode-iframe"
                ref="editModeIframe"
                frameborder="0"
                scrolling="no"
                @load="setupEditMode"
              ></iframe>
            </div>
          </div>

          <!-- HTML Code View -->
          <div v-if="showHTMLCode" class="html-code-container">
            <div class="code-header">
              <h4>HTML Code - Slide {{ currentSlideIndex + 1 }}</h4>
              <button @click="copyHTMLCode" class="copy-button">
                📋 Copy
              </button>
            </div>
            <div class="html-code-wrapper">
              <pre class="html-code-display"><code>{{ currentSlideHTML }}</code></pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Modal>

  <!-- Floating Text Editor - Use Teleport to ensure it's above the modal -->
  <Teleport to="body">
    <div
      v-if="showTextEditor"
      class="floating-text-editor"
      :style="{
        left: editorPosition.x + 'px',
        top: editorPosition.y + 'px',
        position: 'fixed',
        zIndex: 10000
      }"
    >
      <div class="text-editor-header">
        <span class="editor-title">Edit Text</span>
        <div class="editor-buttons">
          <button @click="saveTextEdit" class="editor-save-btn">✓</button>
          <button @click="cancelTextEdit" class="editor-cancel-btn">✕</button>
        </div>
      </div>
      <textarea
        ref="textEditorInput"
        v-model="editingText"
        class="text-editor-input"
        @keydown.enter.ctrl="saveTextEdit"
        @keydown.escape="cancelTextEdit"
        placeholder="Edit the text content..."
        rows="3"
        autofocus
      ></textarea>
      <div class="editor-shortcuts">
        <small>Ctrl+Enter to save, Esc to cancel</small>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
@font-face {
  font-family: 'LXGW Neo ZhiSong Plus';
  src: url('../assets/fonts/LXGWNeoZhiSongPlus.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}

.ai-ppt-generator-container {
  position: sticky;
  /* top and max-height are now set dynamically via :style */
  width: 280px;
  align-self: start;
  display: flex;
  flex-direction: column;
  background: #fafafa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  overflow: hidden;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  z-index: 97; /* Lower than AIQuickAsk (99) to prevent overlap */
  transition: top 0.3s ease, max-height 0.3s ease; /* Smooth transitions */
}

.ai-ppt-generator-header {
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

.ai-ppt-generator-header.collapsed {
  padding: 12px 16px;
  border-bottom-color: transparent;
}

.ai-ppt-generator-header:hover {
  background: rgba(0, 0, 0, 0.04);
}

.ai-ppt-generator-header:hover .collapse-indicator {
  color: #000000;
  transform: scale(1.1);
}

.ai-ppt-generator-title {
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

.ai-ppt-generator-content {
  display: grid;
  grid-template-rows: 1fr;
  overflow: hidden;
  transition: grid-template-rows 0.25s ease, border-top-color 0.25s ease;
  border-top: 1px solid #f0f0f0;
}

.ai-ppt-generator-content.collapsed {
  grid-template-rows: 0fr;
  border-top-color: transparent;
}

.ai-ppt-generator-inner {
  padding: 16px;
  min-height: 0;
  opacity: 1;
  filter: blur(0);
  transition: padding 0.2s ease, opacity 0.2s ease, filter 0.2s ease;
}

.ai-ppt-generator-content.collapsed .ai-ppt-generator-inner {
  padding-top: 0;
  padding-bottom: 0;
  opacity: 0;
  filter: blur(4px);
}

.ppt-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ppt-card {
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ppt-card:hover {
  border-color: #000000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.ppt-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.ppt-card-title {
  font-family: 'Playfair Display', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 14px;
  font-weight: 600;
  color: #000000;
  margin: 0;
  flex: 1;
}

.ppt-card-slides {
  font-size: 12px;
  color: #666666;
  background: #f0f0f0;
  padding: 2px 8px;
  border-radius: 4px;
  margin-left: 8px;
}

.ppt-card-meta {
  font-size: 12px;
  color: #999999;
}

.button-group {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.generate-button {
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

.generate-button:hover {
  background: #333333 !important;
  border-color: #333333 !important;
  transform: translateY(-1px);
}

.generate-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  color: #858585 !important;
}

.generate-step-button {
  border-radius: 8px !important;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  background: #ffffff !important;
  border-color: #000000 !important;
  color: #000000 !important;
  height: 36px !important;
  padding: 0 16px !important;
  transition: all 0.2s ease !important;
}

.generate-step-button:hover:not(:disabled) {
  background: #f5f5f5 !important;
  border-color: #333333 !important;
  color: #333333 !important;
  transform: translateY(-1px);
}

.generate-step-button:disabled {
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

/* Progress Section */
.progress-section {
  margin-bottom: 16px;
  padding: 12px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-text {
  font-size: 12px;
  color: #666666;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.progress-count {
  font-size: 12px;
  color: #000000;
  font-weight: 600;
  margin-left: 8px;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: #e9ecef;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #000000;
  border-radius: 3px;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.progress-fill.complete {
  background: #28a745;
}

.progress-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.status-icon {
  font-size: 14px;
}

.status-text {
  font-size: 11px;
  color: #333333;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-weight: 500;
}

/* Failed Slides Section */
.failed-slides-section {
  margin-bottom: 16px;
  padding: 12px;
  background: #fff5f5;
  border: 1px solid #fed7d7;
  border-radius: 8px;
}

.failed-slides-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.failed-slides-title {
  font-size: 12px;
  color: #e53e3e;
  font-weight: 600;
  margin: 0;
  font-family: 'Playfair Display', 'LXGW Neo ZhiSong Plus', serif;
}

.retry-all-button {
  background: #e53e3e !important;
  border-color: #e53e3e !important;
  color: #ffffff !important;
  font-size: 10px !important;
  height: 24px !important;
  padding: 0 8px !important;
  border-radius: 4px !important;
  transition: all 0.2s ease !important;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif !important;
}

.retry-all-button:hover:not(:disabled) {
  background: #c53030 !important;
  border-color: #c53030 !important;
  transform: translateY(-1px);
}

.failed-slides-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.failed-slide-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  background: #ffffff;
  border: 1px solid #fed7d7;
  border-radius: 4px;
}

.failed-slide-title {
  font-size: 11px;
  color: #666666;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 8px;
}

.regenerate-button {
  background: #e53e3e !important;
  border-color: #e53e3e !important;
  color: #ffffff !important;
  font-size: 10px !important;
  height: 24px !important;
  padding: 0 8px !important;
  border-radius: 4px !important;
  transition: all 0.2s ease !important;
}

.regenerate-button:hover:not(:disabled) {
  background: #c53030 !important;
  border-color: #c53030 !important;
  transform: translateY(-1px);
}

/* Mobile styles */
.mobile-ppt-generator {
  position: fixed;
  bottom: 224px; /* Position above AIQuickAsk button with more space */
  right: 32px;
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

.mobile-floating-button:disabled {
  background: #cccccc;
  cursor: not-allowed;
  opacity: 0.6;
}

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

/* PPT Modal Styles */
.ppt-modal .ant-modal-content {
  padding: 0;
}

.ppt-modal-content {
  height: 85vh;
  display: flex;
  flex-direction: column;
}

.ppt-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
  flex-shrink: 0;
}

.ppt-modal-title {
  font-family: 'Playfair Display', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 18px;
  font-weight: 600;
  color: #000000;
  margin: 0;
}

.ppt-modal-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.slide-counter {
  font-size: 14px;
  color: #666666;
  font-weight: 500;
}

.modal-buttons {
  display: flex;
  align-items: center;
  gap: 12px;
}

.html-code-button {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  color: #666666;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
}

.html-code-button:hover {
  background: #e9ecef;
  border-color: #dee2e6;
  color: #495057;
}

.html-code-button.active {
  background: #000000;
  border-color: #000000;
  color: #ffffff;
}

.edit-button {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  color: #666666;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
}

.edit-button:hover {
  background: #e9ecef;
  border-color: #dee2e6;
  color: #495057;
}

.edit-button.active {
  background: #000000;
  border-color: #000000;
  color: #ffffff;
}

.html-code-container {
  flex: 1;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  padding: 24px;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.code-header h4 {
  margin: 0;
  font-family: 'Playfair Display', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 16px;
  color: #000000;
}

.copy-button {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  color: #666666;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
}

.copy-button:hover {
  background: #e9ecef;
  border-color: #dee2e6;
  color: #495057;
}

.html-code-wrapper {
  flex: 1;
  overflow: hidden;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  background: #f8f9fa;
}

.html-code-display {
  width: 100%;
  height: 100%;
  background: #f8f9fa;
  padding: 16px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  color: #333333;
  margin: 0;
  border: none;
  max-height: calc(85vh - 200px);
}

.edit-container {
  flex: 1;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  padding: 24px;
}

.edit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.edit-header h4 {
  margin: 0;
  font-family: 'Playfair Display', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 16px;
  color: #000000;
}

.edit-actions {
  display: flex;
  gap: 8px;
}

.save-button {
  background: #000000;
  border: 1px solid #000000;
  color: #ffffff;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-weight: 600;
}

.save-button:hover {
  background: #333333;
  border-color: #333333;
}

.cancel-edit-button {
  background: #ffffff;
  border: 1px solid #d9d9d9;
  color: #666666;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
}

.cancel-edit-button:hover {
  background: #f5f5f5;
  border-color: #000000;
  color: #000000;
}

.edit-content {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  min-height: 0;
}

.edit-preview {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.edit-preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
  min-height: 400px;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.edit-textarea {
  flex: 1;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  padding: 12px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
  resize: none;
  background: #ffffff;
  color: #333333;
  min-height: 300px;
}

.edit-textarea:focus {
  border-color: #000000;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
  outline: none;
}

.edit-instructions {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 12px;
  font-size: 12px;
  color: #333333;
}

.edit-instructions p {
  margin: 0 0 8px 0;
  font-weight: 600;
}

.edit-instructions ul {
  margin: 0;
  padding-left: 16px;
}

.edit-instructions li {
  margin-bottom: 4px;
  line-height: 1.4;
}

/* Visual Edit Mode Styles */
.visual-edit-container {
  flex: 1;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  padding: 24px;
}

.edit-instructions-bar {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 16px;
  font-size: 12px;
  color: #333333;
}

.edit-instruction {
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-weight: 500;
}

.visual-edit-content {
  flex: 1;
  background: transparent;
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.edit-mode-iframe {
  width: 100%;
  height: 100%;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background: #ffffff;
  min-height: 500px;
  max-width: 100%;
  object-fit: contain;
}

/* Floating Text Editor */
.floating-text-editor {
  position: fixed !important;
  background: #ffffff;
  border: 2px solid #000000;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3); /* Stronger shadow */
  z-index: 999999 !important; /* Extremely high z-index */
  min-width: 300px;
  max-width: 400px;
}

/* Ensure modal doesn't clip the editor */
.ppt-modal :deep(.ant-modal-wrap) {
  overflow: visible !important;
}
.ppt-modal :deep(.ant-modal) {
  overflow: visible !important;
}
.ppt-modal :deep(.ant-modal-content) {
  overflow: visible !important;
}

.text-editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #000000;
  color: #ffffff;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
}

.editor-title {
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
}

.editor-buttons {
  display: flex;
  gap: 4px;
}

.editor-save-btn, .editor-cancel-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #ffffff;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.editor-save-btn:hover {
  background: rgba(0, 0, 0, 0.8);
  border-color: #000000;
}

.editor-cancel-btn:hover {
  background: rgba(0, 0, 0, 0.8);
  border-color: #000000;
}

.text-editor-input {
  width: 100%;
  border: none;
  padding: 12px;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 14px;
  line-height: 1.4;
  resize: vertical;
  min-height: 60px;
  max-height: 150px;
  outline: none;
}

.editor-shortcuts {
  background: #f8f9fa;
  padding: 6px 12px;
  border-top: 1px solid #e9ecef;
  font-size: 10px;
  color: #666666;
  text-align: center;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
}

.close-modal-button {
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

.close-modal-button:hover {
  background: rgba(0, 0, 0, 0.06);
  color: #000000;
}

.ppt-modal-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

.thumbnails-sidebar {
  background: #f8f9fa;
  border-right: 1px solid #e9ecef;
  overflow-y: auto;
  flex-shrink: 0;
  transition: width 0.3s ease;
  min-width: 180px;
  max-width: 280px;
}

.thumbnails-list {
  padding: 16px 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.thumbnail-item {
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
  position: relative;
  aspect-ratio: 16/9;
}

.thumbnail-item:hover {
  border-color: #000000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.thumbnail-item.active {
  border-color: #000000;
  background: #f8f9fa;
}

.thumbnail-preview {
  width: 100%;
  height: 100px;
  background: #ffffff;
  overflow: hidden;
  position: relative;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumbnail-iframe {
  width: 1280px;
  height: 720px;
  transform: scale(0.088);
  transform-origin: center center;
  pointer-events: none;
  border: none;
  position: absolute;
  border-radius: 4px;
}

.thumbnail-overlay {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: #ffffff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  z-index: 20;
  pointer-events: none;
}

.thumbnail-number {
  font-size: 12px;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
}

.slide-viewer {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  min-width: 0;
  min-height: 0;
}

.slide-navigation {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  transform: translateY(-50%);
  display: flex;
  justify-content: space-between;
  padding: 0 16px;
  z-index: 10;
  pointer-events: none;
}

.nav-button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #e9ecef;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  pointer-events: auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.nav-button:hover:not(:disabled) {
  background: #ffffff;
  border-color: #000000;
  color: #000000;
  transform: scale(1.1);
}

.nav-button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.slide-container {
  flex: 1;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow: hidden;
  position: relative;
  min-height: 0;
  max-width: 90%;
  max-height: 80%;
  margin: auto;
}

.slide-iframe {
  width: 100%;
  height: 100%;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background: #ffffff;
  max-width: 1280px;
  max-height: 720px;
}

/* Transitions */
.ai-ppt-generator-fade-enter-active,
.ai-ppt-generator-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.ai-ppt-generator-fade-enter-from,
.ai-ppt-generator-fade-leave-to {
  opacity: 0;
  transform: translateX(10px);
}

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
/* Scaled slide viewer (keeps 16:9, removes inner scrolling) */
.slide-viewer {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.slide-container {
  position: relative;
  width: 100%;
  max-width: 90%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: transparent;
  margin: 0 auto;
}

.slide-iframe {
  position: absolute;
  top: 50%;
  left: 50%;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background: #ffffff;
  transform-origin: center center;
  /* width & height set to 1280x720 by script, then scaled */
}

.slide-viewer {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;  /* allow shrinking in flex layout */
  min-height: 0; /* allow shrinking in flex layout */
  align-items: center;
  justify-content: center;
  padding: 12px;
}

.slide-container {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 6px;
}

.slide-iframe {
  position: absolute;
  top: 0;
  left: 0;
  border: 0;
  transform-origin: 0 0;
  /* width & height are set to 1280x720 by script, then scaled */
}

/* Responsive adjustments */
@media (max-width: 1200px) {
  .ai-ppt-generator-container {
    display: none;
  }
}

@media (max-width: 768px) {
  .mobile-ppt-generator {
    bottom: 208px; /* More space above AIQuickAsk on mobile */
    right: 24px;
  }

  .mobile-floating-button {
    width: 48px;
    height: 48px;
    font-size: 20px;
  }

  .thumbnails-sidebar {
    min-width: 140px;
    max-width: 180px;
  }

  .thumbnail-preview {
    height: 70px;
  }

  .thumbnail-iframe {
    width: 1280px;
    height: 720px;
    transform: scale(0.055);
    transform-origin: center center;
  }

  .thumbnail-overlay {
    top: 4px;
    left: 4px;
    padding: 2px 6px;
    font-size: 10px;
  }

  .floating-text-editor {
    min-width: 280px;
    max-width: 320px;
  }

  .text-editor-input {
    font-size: 13px;
  }

  .edit-mode-iframe {
    min-height: 300px;
  }

  .nav-button {
    width: 36px;
    height: 36px;
  }

  .slide-iframe {
    min-width: 280px;
    min-height: 158px;
  }

  .failed-slides-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .retry-all-button {
    align-self: flex-end;
  }

  .slide-container {
    padding: 16px;
  }

  .ppt-modal-body {
    flex-direction: column;
  }

  .thumbnails-sidebar {
    width: 100%;
    height: 100px;
    border-right: none;
    border-bottom: 1px solid #e9ecef;
  }

  .thumbnails-list {
    flex-direction: row;
    overflow-x: auto;
    padding: 8px;
    gap: 8px;
  }

  .thumbnail-item {
    flex-shrink: 0;
    width: 100px;
  }
}

@media (min-width: 1201px) {
  .mobile-ppt-generator,
  .mobile-overlay {
    display: none;
  }
}

/* Medium screens - adjust thumbnail scaling */
@media (max-width: 1200px) and (min-width: 769px) {
  .thumbnails-sidebar {
    min-width: 170px;
    max-width: 220px;
  }

  .thumbnail-preview {
    height: 90px;
  }

  .thumbnail-iframe {
    width: 1280px;
    height: 720px;
    transform: scale(0.075);
    transform-origin: center center;
  }

  .slide-iframe {
    min-width: 400px;
    min-height: 225px;
  }
}

/* Large screens - optimal scaling */
@media (min-width: 1201px) {
  .thumbnail-iframe {
    width: 1280px;
    height: 720px;
    transform: scale(0.15);
    transform-origin: center center;
  }
}
</style>
