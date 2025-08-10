<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { Button, message, Modal, Input } from 'ant-design-vue';
import factCheckService from '../services/factCheckService';
import { usePPTGenerations } from '../composables/usePPTGenerations';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Prism from 'prismjs';
import 'prismjs/components/prism-markup.min.js';
import 'prismjs/themes/prism-tomorrow.css';
import { Presentation } from 'lucide-vue-next';

const { t } = useI18n();
const { recordPPTGeneration } = usePPTGenerations();

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
const isCollapsed = ref(true)
const showTempGlow = ref(false);
const savedPPT = ref(null);
const showPPTModal = ref(false);
const currentSlideIndex = ref(0);
const scrollContainer = ref(null);
const slideElements = ref([]);
const isScrolling = ref(false);
const showHTMLCode = ref(false);
const currentSlideHTML = ref('');
const isEditMode = ref(false);
const editableSlideContent = ref('');
const selectedElement = ref(null);
const editingText = ref('');
const showTextEditor = ref(false);
const editorPosition = ref({ x: 0, y: 0 });
const textEditorInput = ref(null);
// Removed unused refs: slideContainerRef, slideIframeRef
const visualEditContainer = ref(null);
const editModeIframe = ref(null);
const isGeneratingPDF = ref(false);
const slideChangeDescription = ref('');
const isRegenerating = ref(false);

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
// Mobile expanded slide overlay state
const isMobileSlideExpanded = ref(false);
const expandedSlideIndex = ref(null);

const isSessionReady = computed(() => !!props.sessionId);

// Computed property for syntax-highlighted HTML
const highlightedHTML = computed(() => {
  if (!currentSlideHTML.value) return '';
  
  // Format HTML with proper indentation
  const formattedHTML = formatHTML(currentSlideHTML.value);
  
  // Apply syntax highlighting
  const highlighted = Prism.highlight(formattedHTML, Prism.languages.markup, 'markup');
  
  // Add line numbers
  return addLineNumbers(highlighted);
});

// Function to format HTML with proper indentation
const formatHTML = (html) => {
  let formatted = '';
  let indent = 0;
  const tab = '  '; // 2 spaces for indentation
  
  html.split(/(<[^>]*>)/).forEach((part) => {
    if (part.match(/^<\/\w/)) {
      // Closing tag
      indent--;
      formatted += tab.repeat(Math.max(0, indent)) + part + '\n';
    } else if (part.match(/^<\w[^>]*[^\/]>$/)) {
      // Opening tag
      formatted += tab.repeat(indent) + part + '\n';
      indent++;
    } else if (part.match(/^<\w[^>]*\/>$/)) {
      // Self-closing tag
      formatted += tab.repeat(indent) + part + '\n';
    } else if (part.trim()) {
      // Text content
      formatted += tab.repeat(indent) + part.trim() + '\n';
    }
  });
  
  return formatted.trim();
};

// Function to add line numbers to highlighted code
const addLineNumbers = (highlightedCode) => {
  const lines = highlightedCode.split('\n');
  return lines.map((line, index) => {
    const lineNumber = String(index + 1).padStart(3, ' ');
    return `<span class="line-number">${lineNumber}</span><span class="line-content">${line}</span>`;
  }).join('\n');
};

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

// New: concise label for the Generate button that avoids long titles
const generateButtonLabel = computed(() => {
  if (isGenerating.value) {
    const total = generationProgress.value.total || 0;
    if (total > 0) {
      const index = Math.min(generationProgress.value.current + 1, total);
      return `Slide ${index}/${total}`;
    }
    return 'Generating...';
  }
  return savedPPT.value ? 'Regenerate PPT' : 'Generate PPT';
});

// Build a full HTML document for iframe srcdoc to ensure fonts/icons and resets
const slideHeadHTML = `
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <!-- Legacy Material Icons (ligatures) -->
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet">
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Sharp" rel="stylesheet">
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Two+Tone" rel="stylesheet">
  <!-- Material Symbols (variable fonts) -->
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Sharp:opsz,wght,FILL,GRAD@24,400,0,0" />
  <style>
    html, body { margin: 0; padding: 0; width: 1280px; height: 720px; background: #ffffff; }
    * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
    /* Set defaults for Material Symbols classes */
    .material-symbols-outlined,
    .material-symbols-rounded,
    .material-symbols-sharp {
      font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
      font-size: 24px;
      line-height: 1;
      vertical-align: middle;
      display: inline-block;
    }
    /* Ensure legacy Material Icons classes render consistently */
    .material-icons,
    .material-icons-outlined,
    .material-icons-round,
    .material-icons-sharp,
    .material-icons-two-tone {
      font-family: 'Material Icons', 'Material Icons Outlined', 'Material Icons Round', 'Material Icons Sharp', 'Material Icons Two Tone', 'Material Symbols Outlined', 'Material Symbols Rounded', 'Material Symbols Sharp', sans-serif;
      font-size: 24px;
      line-height: 1;
      vertical-align: middle;
      display: inline-block;
    }
  </style>
`;

const buildSlideSrcDoc = (bodyContent) => {
  const content = bodyContent || '';
  // If the content already looks like a full HTML document, return as-is
  if (/<!doctype|<html[\s>]/i.test(content)) {
    return content;
  }
  return `<!doctype html><html><head>${slideHeadHTML}</head><body>${content}</body></html>`;
};

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
  // Handle both desktop scrollable slides and mobile slides
  slideElements.value.forEach((slideElement) => {
    if (!slideElement) return;
    
    // Check for desktop scrollable container
    let slideContainer = slideElement.querySelector('.slide-container-scrollable');
    let iframe = slideElement.querySelector('.slide-iframe-scrollable');
    
    // Check for mobile container
    if (!slideContainer) {
      slideContainer = slideElement.querySelector('.mobile-slide-container');
      iframe = slideElement.querySelector('.mobile-slide-iframe');
    }
    
    if (!slideContainer || !iframe) return;
    
    const W = 1280, H = 720;
    const containerWidth = slideContainer.clientWidth;
    const containerHeight = slideContainer.clientHeight;
    const scale = Math.min(containerWidth / W, containerHeight / H);
    
    iframe.style.width = W + 'px';
    iframe.style.height = H + 'px';
    iframe.style.transform = `scale(${scale})`;
    iframe.style.transformOrigin = 'center center';
    iframe.style.position = 'absolute';
    iframe.style.top = '50%';
    iframe.style.left = '50%';
    iframe.style.marginTop = `-${H/2}px`;
    iframe.style.marginLeft = `-${W/2}px`;
  });

  // Also handle expanded mobile slide overlay
  try {
    const expandedContainer = document.querySelector('.mobile-expanded-slide-container');
    const expandedIframe = document.querySelector('.mobile-expanded-slide-iframe');
    if (expandedContainer && expandedIframe) {
      const W = 1280, H = 720;
      const containerWidth = expandedContainer.clientWidth;
      const containerHeight = expandedContainer.clientHeight;
      const scale = Math.min(containerWidth / W, containerHeight / H);

      expandedIframe.style.width = W + 'px';
      expandedIframe.style.height = H + 'px';
      expandedIframe.style.transform = `scale(${scale})`;
      expandedIframe.style.transformOrigin = 'center center';
      expandedIframe.style.position = 'absolute';
      expandedIframe.style.top = '50%';
      expandedIframe.style.left = '50%';
      expandedIframe.style.marginTop = `-${H/2}px`;
      expandedIframe.style.marginLeft = `-${W/2}px`;
    }
  } catch {}
};

// Ensure thumbnail iframes are perfectly centered and scaled to fit preview
const fitThumbnails = () => {
  try {
    const previews = document.querySelectorAll('.thumbnail-preview');
    previews.forEach((preview) => {
      const iframe = preview.querySelector('.thumbnail-iframe');
      if (!iframe) return;
      const W = 1280, H = 720;
      const containerWidth = preview.clientWidth;
      const containerHeight = preview.clientHeight;
      const scale = Math.min(containerWidth / W, containerHeight / H);

      iframe.style.width = W + 'px';
      iframe.style.height = H + 'px';
      iframe.style.transform = `translate(-50%, -50%) scale(${scale})`;
      iframe.style.transformOrigin = 'center center';
      iframe.style.position = 'absolute';
      iframe.style.top = '50%';
      iframe.style.left = '50%';
      iframe.style.marginTop = '0';
      iframe.style.marginLeft = '0';
    });
  } catch {}
};

// Function to handle scroll events and update current slide index
const handleScroll = () => {
  if (isScrolling.value || !scrollContainer.value) return;
  
  const container = scrollContainer.value;
  const containerTop = container.scrollTop;
  const containerHeight = container.clientHeight;
  // Shift detection point higher - use 40% from top instead of 50% (center)
  const detectionPoint = containerTop + containerHeight * 0.6;
  
  // Find which slide is currently in the detection zone (shifted higher)
  let newIndex = 0;
  slideElements.value.forEach((slideElement, index) => {
    if (!slideElement) return;
    const slideTop = slideElement.offsetTop;
    const slideHeight = slideElement.offsetHeight;
    const slideCenter = slideTop + slideHeight / 2;
    
    if (slideCenter <= detectionPoint) {
      newIndex = index;
    }
  });
  
  if (newIndex !== currentSlideIndex.value) {
    currentSlideIndex.value = newIndex;
  }
};

// Scale edit mode iframe similarly
const fitEditSlide = () => {
  const W = 1280, H = 720;
  const c = visualEditContainer.value;
  const f = editModeIframe.value;
  if (!c || !f) return;
  
  // Get the actual available space
  const containerRect = c.getBoundingClientRect();
  const availableWidth = containerRect.width - 48; // Account for padding
  const availableHeight = containerRect.height - 48; // Account for padding
  
  // Calculate scale to fit completely within container
  const scaleX = availableWidth / W;
  const scaleY = availableHeight / H;
  const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100%
  
  console.log('Edit mode scale:', scale, 'available:', availableWidth, 'x', availableHeight);
  
  f.style.width = W + 'px';
  f.style.height = H + 'px';
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
  window.addEventListener('resize', fitThumbnails);
  
  // Listen for the open PPT generator event
  window.addEventListener('open-ppt-generator', () => {
    if (props.visible && !isMobile.value) {
      isCollapsed.value = false;
      emit('collapse-changed', isCollapsed.value);
      
      // Show temporary glow effect
      showTempGlow.value = true;
      setTimeout(() => {
        showTempGlow.value = false;
      }, 3000); // Glow for 3 seconds
    }
  });
  
  // Listen for mobile PPT generator open event
  window.addEventListener('open-ai-ppt-mobile', () => {
    console.log('AIPPTGenerator received open-ai-ppt-mobile event, isMobile:', isMobile.value, 'visible:', props.visible);
    if (isMobile.value && props.visible) {
      console.log('Opening mobile PPT overlay');
      isMobileOverlayOpen.value = true;
      // Force slide scaling after modal opens
      setTimeout(() => {
        fitSlide();
      }, 200);
    }
  });
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
  window.removeEventListener('resize', fitSlide);
  window.removeEventListener('resize', fitThumbnails);
  window.removeEventListener('open-ppt-generator', () => {});
  window.removeEventListener('open-ai-ppt-mobile', () => {});
});

// Watch for sessionId changes to refresh PPT data when loading different conversations
watch(() => props.sessionId, (newSessionId, oldSessionId) => {
  if (newSessionId !== oldSessionId && newSessionId) {
    // Clear existing PPT state
    savedPPT.value = null;
    isGenerating.value = false;
    generationProgress.value = {
      current: 0,
      total: 0,
      currentTask: '',
      failedSlides: [],
      isComplete: false
    };
    
    // Load PPT for the new session
    loadSavedPPT();
  }
}, { immediate: false });

watch(showPPTModal, (open) => {
  if (open) {
    nextTick(() => {
      // Small delay to ensure DOM is fully rendered
      setTimeout(() => {
        fitSlide();
        fitThumbnails();
        // Set up scroll listener
        if (scrollContainer.value) {
          scrollContainer.value.addEventListener('scroll', handleScroll);
        }
      }, 100);
    });
  } else {
    // Clean up scroll listener
    if (scrollContainer.value) {
      scrollContainer.value.removeEventListener('scroll', handleScroll);
    }
  }
});
watch(currentSlideIndex, () => nextTick(fitSlide));
watch(savedPPT, (newPPT) => {
  if (newPPT && showPPTModal.value) {
    nextTick(() => {
      setTimeout(fitSlide, 100);
      setTimeout(fitThumbnails, 120);
    });
  }
});
watch(isEditMode, (editing) => {
  if (editing) {
    nextTick(fitEditSlide);
  } else {
    // When exiting edit mode, scroll back to the current slide
    nextTick(() => {
      setTimeout(() => {
        if (scrollContainer.value && slideElements.value[currentSlideIndex.value]) {
          slideElements.value[currentSlideIndex.value].scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }, 100);
    });
  }
});

// Open/close expanded slide on mobile
const expandMobileSlide = (index) => {
  if (!isMobile.value) return;
  expandedSlideIndex.value = index;
  isMobileSlideExpanded.value = true;
  nextTick(() => setTimeout(fitSlide, 50));
};

const closeExpandedSlide = () => {
  isMobileSlideExpanded.value = false;
  expandedSlideIndex.value = null;
};

watch(showHTMLCode, (showingHTML) => {
  if (!showingHTML && showPPTModal.value) {
    // When returning from HTML view to scrollable view, re-setup scroll listener
    nextTick(() => {
      setTimeout(() => {
        if (scrollContainer.value) {
          // Clean up any existing listener first
          scrollContainer.value.removeEventListener('scroll', handleScroll);
          // Add the scroll listener
          scrollContainer.value.addEventListener('scroll', handleScroll);
          // Scroll to current slide to maintain position
          if (slideElements.value[currentSlideIndex.value]) {
            slideElements.value[currentSlideIndex.value].scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
          }
        }
      }, 100);
    });
  }
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

    for (let i = 0; i < outline.length; i++) {
      const slideInfo = outline[i];
      generationProgress.value.current = i;
      generationProgress.value.currentTask = `Generating slide ${i + 1}: ${slideInfo.title}`;

      let slideResult = null;
      let attempts = 0;
      const maxAttempts = 2; // Reduced to avoid server overload

      while (attempts < maxAttempts && !slideResult) {
        try {
          attempts++;
          if (attempts > 1) {
            generationProgress.value.currentTask = `Retrying slide ${i + 1}: ${slideInfo.title} (attempt ${attempts}/${maxAttempts})`;
          }

          console.log(`Starting generation of slide ${i + 1} (${slideInfo.title}), attempt ${attempts}`);

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
            console.log(`Slide ${i + 1} generated successfully on attempt ${attempts}`);
          } else {
            console.error(`Failed to generate slide ${slideInfo.id} (attempt ${attempts}):`, result.error);
            // Wait longer before retrying to avoid server overload
            if (attempts < maxAttempts) {
              console.log(`Waiting 5 seconds before retrying slide ${i + 1}...`);
              await new Promise(resolve => setTimeout(resolve, 5000));
            }
          }
        } catch (slideError) {
          console.error(`Error generating slide ${slideInfo.id} (attempt ${attempts}):`, slideError);
          // Wait before retrying, especially for server errors
          if (attempts < maxAttempts) {
            if (slideError.status === 500) {
              console.log(`Server error on slide ${i + 1}, waiting 10 seconds before retry...`);
              await new Promise(resolve => setTimeout(resolve, 10000));
            } else {
              console.log(`Waiting 5 seconds before retrying slide ${i + 1}...`);
              await new Promise(resolve => setTimeout(resolve, 5000));
            }
          }
        }
      }

      if (slideResult) {
        slides.push(slideResult);
        generationProgress.value.current = i + 1;
      } else {
        // Track failed slide with complete info for regeneration
        generationProgress.value.failedSlides.push({
          id: slideInfo.id,
          title: slideInfo.title,
          description: slideInfo.description || '',
          index: i,
          slideInfo: slideInfo // Keep original slide info for regeneration
        });
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
      failedSlides: generationProgress.value.failedSlides,
      totalSlides: outline.length
    };

    savePPT(pptData);

    // Record the PPT generation for statistics
    recordPPTGeneration(props.sessionId, slides.length);

    if (generationProgress.value.failedSlides.length > 0) {
      message.warning(`PPT generated with ${slides.length}/${outline.length} slides. ${generationProgress.value.failedSlides.length} slides failed - you can regenerate them individually.`);
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
  // Scroll to the selected slide
  if (scrollContainer.value && slideElements.value[index]) {
    isScrolling.value = true;
    slideElements.value[index].scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
    // Reset scrolling flag after animation
    setTimeout(() => {
      isScrolling.value = false;
    }, 1000);
  }
};

const nextSlide = () => {
  if (currentSlideIndex.value < savedPPT.value.slides.length - 1) {
    goToSlide(currentSlideIndex.value + 1);
  }
};

const prevSlide = () => {
  if (currentSlideIndex.value > 0) {
    goToSlide(currentSlideIndex.value - 1);
  }
};

const clearPPT = () => {
  Modal.confirm({
    title: 'Clear PPT?',
    content: 'This will permanently delete the current presentation. Are you sure you want to continue?',
    okText: 'Yes, Clear',
    cancelText: 'Cancel',
    okType: 'danger',
    onOk() {
      localStorage.removeItem(`ppt_${props.sessionId}`);
      savedPPT.value = null;
      message.success('PPT cleared');
    }
  });
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
            
            // Remove any overlay before getting text content to avoid including tag name
            const overlay = el.querySelector('.edit-mode-overlay');
            if (overlay) overlay.remove();
            
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

          // Ensure body has our default wrapper
          const ensuredBody = cleanedContent.includes('style="padding: 40px; font-family: Arial, sans-serif;"')
            ? cleanedContent
            : `<div style="padding: 40px; font-family: Arial, sans-serif;">${cleanedContent}</div>`;

          // Store body-only; we inject head/resources at render time with buildSlideSrcDoc
          savedPPT.value.slides[currentSlideIndex.value].content = ensuredBody;
          savePPT(savedPPT.value);

          // Force reactivity update
          editableSlideContent.value = '';
          setTimeout(() => {
            editableSlideContent.value = ensuredBody;
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

  isGenerating.value = true;

  try {
    message.info(`Regenerating slide ${failedSlide.index + 1}...`);

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
      // Deep clone the current PPT to avoid mutation issues
      const currentPPT = JSON.parse(JSON.stringify(savedPPT.value));
      
      // Create the new slide
      const newSlide = {
        ...result.data,
        id: failedSlide.id,
        title: failedSlide.title
      };

      // Insert the slide at the correct position
      currentPPT.slides.splice(failedSlide.index, 0, newSlide);

      // Remove this slide from failed slides list
      if (currentPPT.failedSlides) {
        currentPPT.failedSlides = currentPPT.failedSlides.filter(slide => slide.id !== failedSlide.id);
        // Remove the property if no more failed slides
        if (currentPPT.failedSlides.length === 0) {
          delete currentPPT.failedSlides;
        }
      }

      // Save and force reactivity update
      savePPT(currentPPT);
      savedPPT.value = currentPPT;

      message.success(`Slide ${failedSlide.index + 1} regenerated successfully!`);

      // If no more failed slides, show completion message
      if (!currentPPT.failedSlides || currentPPT.failedSlides.length === 0) {
        message.success(`All slides generated successfully! PPT now has ${currentPPT.slides.length} slides.`);
      }
    } else {
      throw new Error(result.error?.message || 'Failed to regenerate slide');
    }
  } catch (error) {
    console.error('Slide regeneration failed:', error);
    message.error(`Failed to regenerate slide ${failedSlide.index + 1}: ${error.message || 'Unknown error'}`);
  } finally {
    isGenerating.value = false;
  }
};

const downloadPDF = async () => {
  if (!savedPPT.value || savedPPT.value.slides.length === 0) {
    message.error('No slides available to export to PDF');
    return;
  }

  isGeneratingPDF.value = true;

  try {
    message.info('Generating PDF... This may take a moment for multiple slides.');

    // Use slide-native size (16:9) for perfect fit
    const SLIDE_W = 1280;
    const SLIDE_H = 720;

    // Create a new jsPDF instance using pixel units and custom page size per slide
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [SLIDE_W, SLIDE_H],
      compressPdf: true
    });

    let isFirstSlide = true;

    for (let i = 0; i < savedPPT.value.slides.length; i++) {
      const slide = savedPPT.value.slides[i];

      // Build a complete HTML document to improve style fidelity inside the iframe
      const htmlDoc = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Sharp:opsz,wght,FILL,GRAD@24,400,0,0" />
<style>
  html, body { margin: 0; padding: 0; width: ${SLIDE_W}px; height: ${SLIDE_H}px; background: #ffffff; }
  /* Improve text rendering & visual fidelity */
  * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
  .material-symbols-outlined,
  .material-symbols-rounded,
  .material-symbols-sharp {
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    font-size: 24px;
    line-height: 1;
    vertical-align: middle;
    display: inline-block;
  }
</style>
</head>
<body>
${slide.content}
</body>
</html>`;

      // Create a temporary offscreen iframe to render the slide
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '-10000px';
      iframe.style.top = '0';
      iframe.style.width = SLIDE_W + 'px';
      iframe.style.height = SLIDE_H + 'px';
      iframe.style.border = '0';
      iframe.srcdoc = htmlDoc;
      document.body.appendChild(iframe);

      // Wait for iframe to load and fonts to be ready
      await new Promise((resolve) => {
        let resolved = false;
        const done = () => { if (!resolved) { resolved = true; resolve(); } };
        iframe.onload = () => {
          try {
            const idoc = iframe.contentDocument || iframe.contentWindow.document;
            if (idoc?.fonts?.ready) {
              idoc.fonts.ready.then(() => setTimeout(done, 50)).catch(done);
            } else {
              setTimeout(done, 150);
            }
          } catch {
            setTimeout(done, 150);
          }
        };
        // Fallback timeout in case onload doesn't fire
        setTimeout(done, 2500);
      });

      try {
        const idoc = iframe.contentDocument || iframe.contentWindow.document;
        // Ensure images are CORS-enabled for html2canvas
        try {
          const imgs = idoc?.images ? Array.from(idoc.images) : [];
          imgs.forEach(img => {
            try { img.crossOrigin = 'anonymous'; } catch {}
          });
        } catch {}

        // Render the iframe body to canvas at higher scale for sharper output
        const canvas = await html2canvas(idoc.body, {
          backgroundColor: '#ffffff',
          width: SLIDE_W,
          height: SLIDE_H,
          windowWidth: SLIDE_W,
          windowHeight: SLIDE_H,
          scale: window.devicePixelRatio > 1 ? 2 : 1,
          useCORS: true,
          allowTaint: false,
          foreignObjectRendering: true
        });

        // Add a new page for each slide after the first
        if (!isFirstSlide) {
          pdf.addPage([SLIDE_W, SLIDE_H], 'landscape');
        }
        isFirstSlide = false;

        const imgData = canvas.toDataURL('image/png', 1.0);
        // Place image to fully cover the page
        pdf.addImage(imgData, 'PNG', 0, 0, SLIDE_W, SLIDE_H, undefined, 'FAST');

      } catch (error) {
        console.error(`Error capturing slide ${i + 1}:`, error);
        if (!isFirstSlide) {
          pdf.addPage([SLIDE_W, SLIDE_H], 'landscape');
        }
        isFirstSlide = false;
        // Add an error placeholder page to keep slide numbering
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, SLIDE_W, SLIDE_H, 'F');
        pdf.setTextColor(200, 0, 0);
        pdf.setFontSize(18);
        pdf.text(`Error loading slide ${i + 1}`, 40, 40);
      } finally {
        // Clean up the temporary iframe
        document.body.removeChild(iframe);
      }
    }

    // Generate filename with timestamp
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
    const safeTitle = (savedPPT.value.title || 'Presentation').replace(/[^a-z0-9]/gi, '_');
    const filename = `${safeTitle}_${timestamp}.pdf`;

    // Save the PDF
    pdf.save(filename);

    message.success(`PDF downloaded successfully: ${filename}`);

  } catch (error) {
    console.error('PDF generation failed:', error);
    message.error('Failed to generate PDF: ' + (error.message || 'Unknown error'));
  } finally {
    isGeneratingPDF.value = false;
  }
};

const handleRegenerateKeyPress = (event) => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    regenerateSlide();
  }
};

const regenerateSlide = async () => {
  if (!props.sessionId || !slideChangeDescription.value.trim()) {
    return;
  }

  if (!savedPPT.value || !savedPPT.value.slides[currentSlideIndex.value]) {
    message.error('No slide to regenerate');
    return;
  }

  isRegenerating.value = true;

  try {
    const currentSlide = savedPPT.value.slides[currentSlideIndex.value];
    
    // Prepare slide info for regeneration with user changes
    const slideInfo = {
      id: currentSlide.id,
      title: currentSlide.title,
      description: slideChangeDescription.value.trim()
    };
    
    console.log('Current slide:', currentSlide);
    console.log('Prepared slideInfo:', slideInfo);
    console.log('Report content length:', props.reportContent?.length);

    const result = await factCheckService.regenerateSingleSlide(props.sessionId, {
      slide_info: slideInfo,
      report_content: props.reportContent,
      theme: savedPPT.value.theme || 'professional',
      current_slide_content: currentSlide.content
    });

    console.log('Regenerate result:', result);

    if (result && result.success && result.data) {
      // Update the slide in the saved PPT
      savedPPT.value.slides[currentSlideIndex.value] = result.data;
      editableSlideContent.value = result.data.content;
      
      // Update localStorage
      savePPT(savedPPT.value);
      
      // Clear the description
      slideChangeDescription.value = '';
      
      message.success('Slide regenerated successfully!');
    } else {
      console.error('Invalid result structure:', result);
      throw new Error(result?.error?.message || 'Failed to regenerate slide - invalid response');
    }
  } catch (error) {
    console.error('Slide regeneration failed:', error);
    message.error(error.message || 'Failed to regenerate slide');
  } finally {
    isRegenerating.value = false;
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
      <Presentation :size="24" />
    </button>
  </div>

  <!-- Mobile Overlay - Use Teleport to render to body -->
  <Teleport to="body">
    <transition name="mobile-overlay">
      <div v-if="isMobile && isMobileOverlayOpen" class="mobile-overlay">
      <div class="mobile-overlay-backdrop" @click="closeMobileOverlay"></div>
      <div class="mobile-overlay-content">
        <div class="mobile-header">
          <h4 class="mobile-title"><Presentation :size="18" style="margin-right: 4px; display: inline-block;" /> {{ t('aiPPT.title') || 'AI PPT Generator' }} <span class="beta-indicator">BETA</span></h4>
          <button class="mobile-close-button" @click="closeMobileOverlay">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M12 4l-8 8m0-8l8 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>

        <div class="mobile-content">
          <div class="ppt-section">
            <!-- Mobile PPT Viewer -->
            <div v-if="savedPPT" class="mobile-ppt-viewer">
              <div class="mobile-ppt-header">
                <h5 class="mobile-ppt-title">{{ savedPPT.title }}</h5>
                <div class="mobile-ppt-meta">
                  <span class="mobile-slide-counter">{{ currentSlideIndex + 1 }} / {{ savedPPT.slides.length }}</span>
                  <button @click="downloadPDF" class="mobile-download-button" :disabled="isGeneratingPDF">
                    {{ isGeneratingPDF ? 'Generating...' : '📄 PDF' }}
                  </button>
                </div>
              </div>
              
              <!-- Mobile Slide Scroller -->
              <div class="mobile-slides-container" ref="scrollContainer">
                <div
                  v-for="(slide, index) in savedPPT.slides"
                  :key="slide.id || index"
                  :ref="el => slideElements[index] = el"
                  class="mobile-slide-item"
                  :class="{ 'active': index === currentSlideIndex }"
                >
                  <div class="mobile-slide-number">{{ index + 1 }} / {{ savedPPT.slides.length }}</div>
                  <div class="mobile-slide-container">
                    <iframe
                      :srcdoc="buildSlideSrcDoc(slide.content)"
                      class="mobile-slide-iframe"
                      frameborder="0"
                      scrolling="no"
                      @load="fitSlide"
                    ></iframe>
                    <div class="mobile-slide-tap-overlay" @click="expandMobileSlide(index)" aria-label="Expand slide"></div>
                  </div>
                </div>
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
                  <span class="failed-slide-title">Slide {{ failedSlide.index + 1 }}</span>
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
                {{ generateButtonLabel }}
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
  </Teleport>

  <!-- Mobile Expanded Slide Overlay -->
  <Teleport to="body">
    <transition name="mobile-expanded-fade">
      <div
        v-if="isMobile && isMobileSlideExpanded && expandedSlideIndex !== null && savedPPT && savedPPT.slides[expandedSlideIndex]"
        class="mobile-expanded-overlay"
      >
        <div class="mobile-expanded-backdrop" @click="closeExpandedSlide"></div>
        <div class="mobile-expanded-content">
          <button class="mobile-expanded-close" @click="closeExpandedSlide" aria-label="Close">
            ✕
          </button>
          <div class="mobile-expanded-slide-container">
            <iframe
              :srcdoc="buildSlideSrcDoc(savedPPT.slides[expandedSlideIndex].content)"
              class="mobile-expanded-slide-iframe"
              frameborder="0"
              scrolling="no"
              @load="fitSlide"
            ></iframe>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>

  <!-- Desktop Version -->
  <transition name="ai-ppt-generator-fade">
    <div v-if="visible && !isMobile" class="ai-ppt-generator-container" :class="{ 'temp-glow': showTempGlow }" :style="{ top: dynamicTopPosition, maxHeight: dynamicMaxHeight }">
      <div class="ai-ppt-generator-header" @click="toggleCollapse" :class="{ 'collapsed': isCollapsed }">
        <h4 class="ai-ppt-generator-title"><Presentation :size="18" style="margin-right: 4px; display: inline-block;" /> {{ t('aiPPT.title') || 'AI PPT Generator' }} <span class="beta-indicator">BETA</span></h4>
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
                  <span class="failed-slide-title">Slide {{ failedSlide.index + 1 }}</span>
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
                {{ generateButtonLabel }}
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
            <button @click="downloadPDF" class="pdf-download-button" :disabled="isGeneratingPDF" v-if="!showHTMLCode && !isEditMode">
              {{ isGeneratingPDF ? 'Generating...' : '📄 Download PDF' }}
            </button>
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
                  :srcdoc="buildSlideSrcDoc(slide.content)"
                  class="thumbnail-iframe"
                  frameborder="0"
                  scrolling="no"
                  @load="fitThumbnails"
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
              class="nav-button up-button"
              title="Previous slide"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M12 10l-4-4-4 4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button
              @click="nextSlide"
              :disabled="currentSlideIndex === savedPPT.slides.length - 1"
              class="nav-button down-button"
              title="Next slide"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>

          <!-- Scrollable Slides Container -->
          <div v-if="!showHTMLCode && !isEditMode" class="slides-scroll-container" ref="scrollContainer">
            <div
              v-for="(slide, index) in savedPPT.slides"
              :key="slide.id || index"
              :ref="el => slideElements[index] = el"
              class="slide-item"
              :class="{ 'active': index === currentSlideIndex }"
            >
              <div class="slide-number">{{ index + 1 }} / {{ savedPPT.slides.length }}</div>
              <div class="slide-container-scrollable">
                <iframe
                  :srcdoc="buildSlideSrcDoc(slide.content)"
                  class="slide-iframe-scrollable"
                  frameborder="0"
                  scrolling="no"
                  @load="fitSlide"
                ></iframe>
              </div>
            </div>
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
            <div class="visual-edit-content" ref="visualEditContainer">
              <iframe
                v-if="savedPPT.slides[currentSlideIndex]"
                :srcdoc="buildSlideSrcDoc(editableSlideContent)"
                class="edit-mode-iframe"
                ref="editModeIframe"
                frameborder="0"
                scrolling="no"
                @load="setupEditMode"
              ></iframe>
            </div>
            <div class="slide-regeneration-input">
              <div class="regeneration-input-container">
                <Input.TextArea
                  v-model:value="slideChangeDescription"
                  :placeholder="t('pptGenerator.editPlaceholder')"
                  :rows="2"
                  class="regeneration-textarea"
                  @keypress="handleRegenerateKeyPress"
                  :disabled="isRegenerating"
                />
                <Button
                  type="primary"
                  :loading="isRegenerating"
                  :disabled="!slideChangeDescription.trim()"
                  @click="regenerateSlide"
                  class="regenerate-ask-button"
                  size="small"
                >
                  <svg width="22" height="22" viewBox="0 0 16 16" fill="currentColor" v-if="!isRegenerating">
                    <path d="M12 2L2 7l4 1 1 4 5-10z" fill="currentColor"/>
                  </svg>
                </Button>
              </div>
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
              <pre class="html-code-display"><code v-html="highlightedHTML"></code></pre>
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
  transition: top 0.3s ease, max-height 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease; /* Smooth transitions */
}

.ai-ppt-generator-container.temp-glow {
  border-color: #ff8c00;
  box-shadow: 0 0 20px rgba(255, 140, 0, 0.6);
  animation: temp-glow-pulse 3s ease-out;
}

@keyframes temp-glow-pulse {
  0% {
    box-shadow: 0 0 0 rgba(255, 140, 0, 0);
    border-color: #e9ecef;
  }
  10% {
    box-shadow: 0 0 25px rgba(255, 140, 0, 0.8);
    border-color: #ff8c00;
  }
  50% {
    box-shadow: 0 0 30px rgba(255, 140, 0, 0.6);
    border-color: #ff8c00;
  }
  90% {
    box-shadow: 0 0 20px rgba(255, 140, 0, 0.4);
    border-color: #ff8c00;
  }
  100% {
    box-shadow: 0 0 0 rgba(255, 140, 0, 0);
    border-color: #e9ecef;
  }
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

.beta-indicator {
  background: #ff6b35;
  color: white;
  font-size: 10px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 8px;
  margin-left: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
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
  /* Allow long titles to wrap and not overflow */
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
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

/* Mobile PPT Viewer Styles */
.mobile-ppt-viewer {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  max-height: 60vh;
}

.mobile-ppt-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mobile-ppt-title {
  font-family: 'Playfair Display', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 16px;
  font-weight: 600;
  color: #000000;
  margin: 0;
}

.mobile-ppt-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.mobile-slide-counter {
  font-size: 12px;
  color: #666666;
  font-weight: 500;
  background: #f0f0f0;
  padding: 4px 8px;
  border-radius: 12px;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
}

.mobile-download-button {
  background: #28a745;
  border: 1px solid #28a745;
  color: #ffffff;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-weight: 600;
}

.mobile-download-button:hover:not(:disabled) {
  background: #218838;
  border-color: #218838;
  transform: translateY(-1px);
}

.mobile-download-button:disabled {
  background: #6c757d;
  border-color: #6c757d;
  cursor: not-allowed;
  opacity: 0.7;
}

.mobile-slides-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px 0;
  scroll-behavior: smooth;
  max-height: 55vh;
}

.mobile-slide-item {
  margin: 0 auto 20px auto;
  max-width: calc(100% - 12px);
  position: relative;
  padding: 0 6px;
  transition: opacity 0.3s ease;
}

.mobile-slide-item:last-child {
  margin-bottom: 12px;
}

.mobile-slide-item.active .mobile-slide-number {
  background: #000000;
  color: #ffffff;
  font-weight: 600;
}

.mobile-slide-number {
  background: #ffffff;
  border: 1px solid #e9ecef;
  color: #666666;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 500;
  margin-bottom: 8px;
  display: inline-block;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
}

.mobile-slide-container {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.mobile-slide-iframe {
  border: none;
  background: #ffffff;
  /* Positioning and scaling handled by JavaScript */
}

.mobile-slide-tap-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  cursor: zoom-in;
  background: transparent;
}

.mobile-button-group {
  display: flex;
  gap: 8px;
  justify-content: center;
  padding-top: 12px;
  border-top: 1px solid #e9ecef;
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
  z-index: 999;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
}

.mobile-overlay-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  backdrop-filter: none;
}

.mobile-overlay-content {
  position: relative;
  width: calc(100% - 32px);
  max-width: 400px;
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  max-height: 80vh;
  overflow: hidden;
}

.mobile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e9ecef;
  flex-shrink: 0;
  background: #fafafa;
}

.mobile-title {
  font-family: 'Playfair Display', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 16px;
  font-weight: 600;
  color: #000000;
  margin: 0;
}

.mobile-close-button {
  background: transparent;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #999999;
  border-radius: 6px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
}

.mobile-close-button:hover {
  background: rgba(0, 0, 0, 0.04);
  color: #000000;
}

.mobile-content {
  flex: 1;
  padding: 24px;
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

.pdf-download-button {
  background: #28a745;
  border: 1px solid #28a745;
  color: #ffffff;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-weight: 600;
}

.pdf-download-button:hover:not(:disabled) {
  background: #218838;
  border-color: #218838;
  transform: translateY(-1px);
}

.pdf-download-button:disabled {
  background: #6c757d;
  border-color: #6c757d;
  cursor: not-allowed;
  opacity: 0.7;
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
  background: #2d3748;
  padding: 0;
  margin: 0;
  border: none;
  outline: none;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  overflow: auto;
  color: #e2e8f0;
  max-height: calc(85vh - 200px);
}

.html-code-display code {
  display: block;
  padding: 20px;
  background: transparent;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  white-space: pre;
}

.line-number {
  display: inline-block;
  width: 45px;
  padding-right: 15px;
  text-align: right;
  color: #718096;
  background: #1a202c;
  border-right: 1px solid #4a5568;
  margin-right: 15px;
  user-select: none;
  font-weight: normal;
}

.line-content {
  display: inline;
}

/* Override Prism theme colors for better visibility */
.html-code-display .token.tag {
  color: #f56565;
}

.html-code-display .token.attr-name {
  color: #ed8936;
}

.html-code-display .token.attr-value {
  color: #68d391;
}

.html-code-display .token.punctuation {
  color: #cbd5e0;
}

.html-code-display .token.string {
  color: #68d391;
}

.html-code-display .token.comment {
  color: #718096;
  font-style: italic;
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
  border: 1px solid #e9ecef;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background: #ffffff;
  /* Dimensions and positioning handled by JavaScript */
}

.slide-regeneration-input {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e9ecef;
  width: 70%;
  margin-left: auto;
  margin-right: auto;
}

.regeneration-input-container {
  display: flex;
  gap: 12px;
  align-items: stretch;
}

.regeneration-textarea {
  flex: 1;
  border-radius: 8px !important;
  border: 1px solid #d9d9d9 !important;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif !important;
  font-size: 14px !important;
  line-height: 1.5;
  resize: none !important;
  margin-bottom: 0;
  transition: all 0.2s ease !important;
  height: 60px;
  background: #ffffff !important;
  padding: 8px 12px !important;
}

.regeneration-textarea:hover:not(:disabled) {
  border-color: #000000 !important;
}

.regeneration-textarea:focus {
  border-color: #000000 !important;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1) !important;
  outline: none !important;
}

.regenerate-ask-button {
  border-radius: 8px;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 14px;
  font-weight: 600;
  background: #000000;
  border-color: #000000;
  width: 60px;
  min-width: 60px;
  max-width: 60px;
  padding: 0;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  height: 60px;
}

.regenerate-ask-button:hover:not(:disabled) {
  background: #333333;
  border-color: #333333;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.regenerate-ask-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: #666666;
  border-color: #666666;
}

.regenerate-ask-button:disabled svg {
  opacity: 1;
  fill: #ffffff;
}

.regenerate-ask-button .ant-btn-loading-icon {
  font-size: 18px;
}

.regenerate-ask-button .ant-spin-dot {
  width: 20px;
  height: 20px;
}

/* Floating Text Editor */
.floating-text-editor {
  position: fixed !important;
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 999999 !important;
  min-width: 320px;
  max-width: 420px;
  overflow: hidden;
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
  background: #fafafa;
  color: #333333;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  border-bottom: 1px solid #e9ecef;
}

.editor-title {
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
}

.editor-buttons {
  display: flex;
  gap: 8px;
}

.editor-save-btn, .editor-cancel-btn {
  background: #ffffff;
  border: 1px solid #d9d9d9;
  color: #666666;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-weight: 600;
}

.editor-save-btn:hover {
  background: #000000;
  border-color: #000000;
  color: #ffffff;
  transform: translateY(-1px);
}

.editor-cancel-btn:hover {
  background: #ff4d4f;
  border-color: #ff4d4f;
  color: #ffffff;
  transform: translateY(-1px);
}

.text-editor-input {
  width: 100%;
  border: none;
  padding: 16px;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif !important;
  font-size: 14px !important;
  line-height: 1.5;
  resize: none;
  min-height: 80px;
  max-height: 180px;
  outline: none;
  background: #ffffff;
  border-radius: 0;
}

.text-editor-input:focus {
  background: #fafafa;
}

.editor-shortcuts {
  background: #f8f9fa;
  padding: 8px 16px;
  border-top: 1px solid #e9ecef;
  font-size: 11px;
  color: #999999;
  text-align: center;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-style: italic;
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
  height: 100px; /* exact 16:9 with item aspect-ratio and padding will be handled by JS centering */
  background: #ffffff;
  overflow: hidden;
  position: relative;
  border-radius: 8px;
}

.thumbnail-iframe {
  width: 1280px;
  height: 720px;
  transform-origin: center center;
  pointer-events: none;
  border: none;
  position: absolute;
  border-radius: 4px;
  top: 50%;
  left: 50%;
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
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 12px;
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

.mobile-overlay-enter-active {
  transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
}

.mobile-overlay-leave-active {
  transition: all 0.2s cubic-bezier(0.755, 0.05, 0.855, 0.06);
}

.mobile-overlay-enter-from {
  opacity: 0;
  backdrop-filter: blur(0px);
}

.mobile-overlay-enter-to {
  opacity: 1;
  backdrop-filter: blur(8px);
}

.mobile-overlay-leave-from {
  opacity: 1;
  backdrop-filter: blur(8px);
}

.mobile-overlay-leave-to {
  opacity: 0;
  backdrop-filter: blur(0px);
}

.mobile-overlay-enter-from .mobile-overlay-content {
  transform: scale(0.5);
  opacity: 0;
}

.mobile-overlay-enter-to .mobile-overlay-content {
  transform: scale(1);
  opacity: 1;
}

.mobile-overlay-leave-from .mobile-overlay-content {
  transform: scale(1);
  opacity: 1;
}

.mobile-overlay-leave-to .mobile-overlay-content {
  transform: scale(0.5);
  opacity: 0;
}
/* Scrollable slides container styles */
.slides-scroll-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background: #f8f9fa;
  padding: 24px 0;
  scroll-behavior: smooth;
}

.slide-item {
  margin: 0 auto 32px auto;
  max-width: calc(100% - 48px);
  position: relative;
  padding: 0 24px;
  transition: opacity 0.3s ease;
}

.slide-item:last-child {
  margin-bottom: 24px;
}

.slide-item.active .slide-number {
  background: #000000;
  color: #ffffff;
  font-weight: 600;
}

.slide-number {
  background: #ffffff;
  border: 1px solid #e9ecef;
  color: #666666;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 12px;
  display: inline-block;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
}

.slide-container-scrollable {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.slide-iframe-scrollable {
  border: none;
  background: #ffffff;
  /* Positioning and scaling handled by JavaScript */
}

/* Responsive adjustments */
@media (max-width: 1200px) {
  .ai-ppt-generator-container {
    display: none;
  }

  /* Expanded slide overlay */
  .mobile-expanded-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .mobile-expanded-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
  }

  .mobile-expanded-content {
    position: relative;
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mobile-expanded-close {
    position: absolute;
    top: 16px;
    right: 16px;
    background: rgba(0,0,0,0.6);
    color: #fff;
    border: none;
    width: 36px;
    height: 36px;
    border-radius: 18px;
    font-size: 18px;
    cursor: pointer;
    z-index: 2;
  }

  .mobile-expanded-slide-container {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: #000;
  }

  .mobile-expanded-slide-iframe {
    border: 0;
    background: #fff;
  }

  .mobile-expanded-fade-enter-active,
  .mobile-expanded-fade-leave-active {
    transition: opacity 0.2s ease;
  }
  .mobile-expanded-fade-enter-from,
  .mobile-expanded-fade-leave-to {
    opacity: 0;
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
    margin-top: -360px; /* Half of original height (720 / 2) */
    margin-left: -640px; /* Half of original width (1280 / 2) */
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
    margin-top: -360px; /* Half of original height (720 / 2) */
    margin-left: -640px; /* Half of original width (1280 / 2) */
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
    margin-top: -360px; /* Half of original height (720 / 2) */
    margin-left: -640px; /* Half of original width (1280 / 2) */
  }
}
</style>
