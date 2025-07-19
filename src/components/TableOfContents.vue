<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';

const emit = defineEmits(['update:collapsed']);

const props = defineProps({
  headings: {
    type: Array,
    default: () => []
  },
  visible: {
    type: Boolean,
    default: false
  }
});

const isTocCollapsed = ref(false);
const isMobile = ref(false);

const checkIsMobile = () => {
  isMobile.value = window.innerWidth <= 1200;
};

onMounted(() => {
  checkIsMobile();
  window.addEventListener('resize', checkIsMobile);
  if (isMobile.value) {
    isTocCollapsed.value = true;
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', checkIsMobile);
});

const toggleTocCollapse = () => {
  isTocCollapsed.value = !isTocCollapsed.value;
  emit('update:collapsed', isTocCollapsed.value);
};

const scrollToHeading = (id) => {
  const element = document.getElementById(id);
  if (element) {
    const headerOffset = 90; // Height of sticky header + some buffer
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }
};

const processedHeadings = computed(() => {
  return props.headings.map(h => ({ ...h, 'data-level': h.level }));
});
</script>

<template>
  <transition name="toc-fade">
    <div v-if="visible && headings.length > 0" class="toc-container">
      <div class="toc-header" @click="toggleTocCollapse">
        <h4 class="toc-title">On this page</h4>
        <div class="collapse-indicator" :class="{ 'collapsed': isTocCollapsed }">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
      <div class="toc-list-container" :class="{ 'collapsed': isTocCollapsed }">
        <ul class="toc-list">
          <li
            v-for="heading in processedHeadings"
            :key="heading.id"
            :class="['toc-item', `toc-item-level-${heading.level}`]"
            @click="scrollToHeading(heading.id)"
          >
            {{ heading.text }}
          </li>
        </ul>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.toc-container {
  position: sticky;
  top: 100px; /* 80px for sticky header + 20px margin */
  width: 240px;
  align-self: start; /* Prevent the container from stretching to the grid row height */
  max-height: calc(100vh - 120px); /* Allow vertical scrolling if TOC is long */
  overflow-y: auto;
  padding-right: 20px; /* For scrollbar spacing */
}

.toc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  margin-bottom: 12px;
}

.toc-header:hover .toc-title {
  color: #0066cc;
}

.toc-title {
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #000;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0;
  transition: color 0.2s ease;
}

.collapse-indicator {
  color: #999;
  transition: transform 0.3s ease;
  display: flex;
  align-items: center;
}

.collapse-indicator.collapsed {
  transform: rotate(-90deg);
}

.toc-list-container {
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows 0.2s ease;
}

.toc-list-container.collapsed {
  grid-template-rows: 0fr;
}

.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
  border-left: 1px solid #e0e0e0;
  overflow: hidden;
  min-height: 0;
  transition: opacity 0.2s ease, filter 0.2s ease, border-color 0.2s ease;
  opacity: 1;
  filter: blur(0);
}

.toc-list-container.collapsed .toc-list {
  opacity: 0;
  filter: blur(4px);
  /* When collapsed, the border should not be visible */
  border-left-color: transparent;
}

.toc-item {
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  color: #666;
  padding: 6px 0 6px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 2px solid transparent;
  margin-left: -1.5px; /* Overlap the parent border */
}

.toc-item:hover {
  color: #000;
  background-color: #fafafa;
}

.toc-item.active { /* Add this class for future active state tracking */
  color: #000;
  font-weight: 500;
  border-left-color: #000;
}

.toc-item-level-3 {
  padding-left: 32px;
  font-size: 13px;
}
.toc-item-level-4 {
  padding-left: 48px;
  font-size: 13px;
}

.toc-fade-enter-active,
.toc-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.toc-fade-enter-from,
.toc-fade-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

@media (max-width: 1200px) {
  .toc-container {
    /* On mobile, the parent .toc-wrapper becomes sticky. This container just needs to sit inside it. */
    position: static;
    top: auto;
    max-height: none;
    overflow-y: visible;
    padding-right: 0;
    width: auto;
    padding: 12px 0; /* Add vertical padding inside the sticky bar */
  }
}
</style>