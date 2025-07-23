<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  heading: {
    type: Object,
    required: true
  },
  activeHeadingId: {
    type: String,
    default: null
  },
  scrolledPastIds: {
    type: Array,
    default: () => []
  }
});

const isExpanded = ref(false);

const hasChildren = computed(() => props.heading.children && props.heading.children.length > 0);

const isActive = computed(() => props.heading.id === props.activeHeadingId);

const isChildActive = computed(() => {
  if (!hasChildren.value) return false;

  const checkChildren = (children) => {
    for (const child of children) {
      if (child.id === props.activeHeadingId) return true;
      if (child.children && child.children.length > 0) {
        if (checkChildren(child.children)) return true;
      }
    }
    return false;
  };

  return checkChildren(props.heading.children);
});

// Auto-expand/collapse based on active state
watch([isActive, isChildActive], ([active, childActive]) => {
  if (hasChildren.value) {
    // Expand if this item or any of its children are active
    isExpanded.value = active || childActive;
  }
});

const toggleExpand = (event) => {
  event.stopPropagation();
  if (hasChildren.value) {
    isExpanded.value = !isExpanded.value;
  }
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

const handleItemClick = () => {
  // For items with children, just toggle expand/collapse
  if (hasChildren.value) {
    isExpanded.value = !isExpanded.value;
  } else {
    scrollToHeading(props.heading.id);
  }
};

const handleTextClick = (event) => {
  event.stopPropagation();
  scrollToHeading(props.heading.id);
}

</script>

<template>
  <li :class="['toc-item', `toc-item-level-${heading.level}`, { active: isActive }]">
    <div class="toc-item-content" @click="handleItemClick">
      <span @click="handleTextClick" class="toc-item-text">{{ heading.text }}</span>
      <button v-if="hasChildren" @click="toggleExpand" class="expand-button">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" :class="{ 'expanded': isExpanded }">
          <path d="M4 2l4 4-4 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
    <div class="submenu-container" :class="{ 'collapsed': !isExpanded }">
      <ul v-if="hasChildren" class="toc-list-nested">
        <TocItem
          v-for="child in heading.children"
          :key="child.id"
          :heading="child"
          :active-heading-id="activeHeadingId"
          :scrolled-past-ids="scrolledPastIds"
        />
      </ul>
    </div>
  </li>
</template>

<style scoped>
.toc-item {
  font-family: 'DM Sans', 'LXGW WenKai', sans-serif;
  font-size: 14px;
  color: #666;
  border-left: 2px solid transparent;
  margin-left: -1.5px; /* Overlap the parent border */
  list-style: none;
  padding: 0;
}

.toc-item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0 6px 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.toc-item > .toc-item-content:hover {
  background-color: #fafafa;
}

/* This is the key: If a toc-item is being hovered, but it also contains a nested toc-item that is ALSO being hovered, remove the background from the parent. */
.toc-item:has(.toc-item:hover):hover > .toc-item-content {
  background-color: transparent;
}

.toc-item-level-3 .toc-item-content {
  padding-left: 32px;
}

.toc-item-level-4 .toc-item-content {
  padding-left: 48px;
}

.toc-item-text {
  flex-grow: 1;
  transition: color 0.2s ease;
}

.toc-item-content:hover .toc-item-text {
  color: #000;
}

.toc-item.active > .toc-item-content {
  background-color: #f0f0f0; /* Example active style */
  border-left-color: #000;
}

.toc-item.active > .toc-item-content .toc-item-text {
  color: #000;
  font-weight: 500;
}

.expand-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0 8px;
  color: #999;
  z-index: 1; /* Ensure it's clickable over hover effects */
}

.expand-button svg {
  transition: transform 0.2s ease-in-out;
}

.expand-button svg.expanded {
  transform: rotate(90deg);
}

.submenu-container {
  display: grid;
  grid-template-rows: 1fr;
  overflow: hidden;
  transition: grid-template-rows 0.25s ease;
}

.submenu-container.collapsed {
  grid-template-rows: 0fr;
}

.toc-list-nested {
  list-style: none;
  padding-left: 0;
  margin: 0;
  min-height: 0; /* Required for grid animation */
  opacity: 1;
  filter: blur(0);
  transition: opacity 0.2s ease, filter 0.2s ease;
}

.submenu-container.collapsed .toc-list-nested {
  opacity: 0;
  filter: blur(4px);
}
</style>
