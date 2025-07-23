<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import TocItem from './TocItem.vue';

const { t } = useI18n();

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
const activeHeadingId = ref(null);
const scrolledPastIds = ref([]);
const isMobile = ref(false);

const checkIsMobile = () => {
  isMobile.value = window.innerWidth <= 1200;
};

let throttleTimer = null;

const handleScroll = () => {
  if (throttleTimer) return;

  throttleTimer = setTimeout(() => {
    const headingElements = props.headings
      .map(h => document.getElementById(h.id))
      .filter(el => el);

    const headerOffset = 120; // Sticky header height + buffer

    let currentActiveId = null;
    // Find the last heading that is above the viewport offset.
    // This works reliably both up and down.
    for (const el of headingElements) {
      if (el.getBoundingClientRect().top <= headerOffset) {
        currentActiveId = el.id;
      } else {
        // Since headings are ordered, we can stop once we find one that is below the offset.
        break;
      }
    }

    const pastIds = [];
    for (const el of headingElements) {
      if (el.getBoundingClientRect().bottom < headerOffset) {
        pastIds.push(el.id);
      }
    }

    activeHeadingId.value = currentActiveId;
    scrolledPastIds.value = pastIds;
    throttleTimer = null;
  }, 100);
};

onMounted(() => {
  checkIsMobile();
  window.addEventListener('resize', checkIsMobile);
  window.addEventListener('scroll', handleScroll, { passive: true });
  if (isMobile.value) {
    isTocCollapsed.value = true;
  }
  // Initial check
  handleScroll();
});

onUnmounted(() => {
  window.removeEventListener('resize', checkIsMobile);
  window.removeEventListener('scroll', handleScroll);
});

const toggleTocCollapse = () => {
  isTocCollapsed.value = !isTocCollapsed.value;
  emit('update:collapsed', isTocCollapsed.value);
};

const nestedHeadings = computed(() => {
  const headings = props.headings;
  if (!headings || headings.length === 0) return [];

  const root = { level: 0, children: [] };
  const path = [root];

  headings.forEach(h => {
    const heading = { ...h, children: [], expanded: ref(false) };
    let parent = path[path.length - 1];
    while (heading.level <= parent.level) {
      path.pop();
      parent = path[path.length - 1];
    }
    parent.children.push(heading);
    path.push(heading);
  });

  return root.children;
});

</script>

<template>
  <transition name="toc-fade">
    <div v-if="visible && nestedHeadings.length > 0" class="toc-container">
      <div class="toc-header" @click="toggleTocCollapse">
        <h4 class="toc-title">{{ t('app.onThisPage') }}</h4>
        <div class="collapse-indicator" :class="{ 'collapsed': isTocCollapsed }">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
      <div class="toc-content" :class="{ 'collapsed': isTocCollapsed }">
        <div class="toc-inner">
          <ul class="toc-list">
            <TocItem
              v-for="heading in nestedHeadings"
              :key="heading.id"
              :heading="heading"
              :active-heading-id="activeHeadingId"
              :scrolled-past-ids="scrolledPastIds"
            />
          </ul>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
@font-face {
  font-family: 'LXGW Neo ZhiSong Plus';
  src: url('../assets/fonts/LXGWNeoZhiSongPlus.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}
.toc-container {
  position: sticky;
  top: 100px; /* 80px for sticky header + 20px margin */
  width: 240px;
  align-self: start; /* Prevent the container from stretching to the grid row height */
  max-height: calc(100vh - 120px); /* Allow vertical scrolling if TOC is long */
  display: flex;
  flex-direction: column;
  padding-right: 10px;
}

.toc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  margin-bottom: 12px;
  background: var(--background-color, #fff); /* Ensure header has a background */
  flex-shrink: 0;
  padding-right: 10px; /* Align with container padding */
}

.toc-header:hover .toc-title {
  color: #0066cc;
}

.toc-title {
  font-family: 'DM Sans', 'LXGW Neo ZhiSong Plus', sans-serif;
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
  transition: transform 0.3s linear, color 0.2s ease-out;
  display: flex;
  align-items: center;
}

.collapse-indicator.collapsed {
  transform: rotate(-90deg);
}

.toc-content {
  overflow-y: auto;
  flex-grow: 1;
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows 0.25s ease;
}

.toc-content.collapsed {
  grid-template-rows: 0fr;
  overflow: hidden;
}

.toc-inner {
  min-height: 0;
  opacity: 1;
  filter: blur(0);
  transition: opacity 0.2s ease, filter 0.2s ease;
}

.toc-content.collapsed .toc-inner {
  opacity: 0;
  filter: blur(4px);
}

.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
  border-left: 1px solid #e0e0e0;
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
    position: static;
    top: auto;
    max-height: 600px;
    overflow-y: visible;
    padding-right: 0;
    width: auto;
    padding: 12px 0;
  }

  .toc-header {
    flex-shrink: 0;
    background: transparent;
    z-index: 1;
    margin-bottom: 8px;
  }

  .toc-content {
    flex: 1;
    overflow-y: auto;
    max-height: 500px;
  }

  .toc-content:not(.collapsed) {
    border-top: 1px solid #e0e0e0;
    padding-top: 8px;
  }
}
</style>
