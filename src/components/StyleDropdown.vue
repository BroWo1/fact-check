<template>
  <div class="style-dropdown" ref="dropdownRef">
    <button
      ref="triggerRef"
      type="button"
      class="style-dropdown-trigger"
      :class="{ open: isOpen }"
      @click="toggleOpen"
    >
      <span class="style-icon">{{ selectedOption.icon }}</span>
      <span class="style-text">{{ selectedOption.label }}</span>
      <span class="caret">▼</span>
    </button>
    <teleport to="body">
      <transition name="dropdown-fade">
        <div
          v-if="isOpen"
          class="style-dropdown-menu"
          :style="menuStyles"
          @mousedown.stop
          @click.stop
        >
          <div
            v-for="option in options"
            :key="option.value"
            class="style-dropdown-item"
            :class="{ active: option.value === modelValue }"
            @click="selectOption(option.value)"
            @mouseenter="showTooltip(option.value)"
            @mouseleave="hideTooltip"
          >
            <span class="item-icon">{{ option.icon }}</span>
            <span class="item-text">{{ option.label }}</span>
            <span v-if="option.value === modelValue" class="item-check">✓</span>
            <transition name="style-tooltip-pop">
              <div v-if="hovered === option.value" class="style-tooltip">
                <div class="tooltip-arrow"></div>
                <div class="tooltip-header">{{ option.label }}</div>
                <div class="tooltip-desc">{{ option.description }}</div>
              </div>
            </transition>
          </div>
        </div>
      </transition>
    </teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'

const SHOW_DELAY = 300
const HIDE_DELAY = 100

const props = defineProps({
  modelValue: {
    type: String,
    default: 'professional'
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const { t } = useI18n()

const dropdownRef = ref(null)
const triggerRef = ref(null)
const isOpen = ref(false)
const hovered = ref(null)
const menuStyles = ref({})
const MIN_MENU_WIDTH = 200
const MAX_MENU_WIDTH = 280
let showTimer = null
let hideTimer = null

const options = computed(() => ([
  {
    value: 'professional',
    icon: '📊',
    label: t('app.professional'),
    description: t('app.styleDescriptions.professional')
  },
  {
    value: 'informational',
    icon: '📚',
    label: t('app.informational'),
    description: t('app.styleDescriptions.informational')
  },
  {
    value: 'concise',
    icon: '⚡',
    label: t('app.concise'),
    description: t('app.styleDescriptions.concise')
  }
]))

const selectedOption = computed(() => {
  return options.value.find(option => option.value === props.modelValue) || options.value[0]
})

const toggleOpen = () => {
  if (props.disabled) {
    return
  }
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    nextTick(updateMenuPosition)
  }
  if (!isOpen.value) {
    hovered.value = null
  }
}

const selectOption = (value) => {
  emit('update:modelValue', value)
  isOpen.value = false
  hovered.value = null
}

const showTooltip = (value) => {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
  if (showTimer) {
    clearTimeout(showTimer)
  }
  showTimer = setTimeout(() => {
    hovered.value = value
    showTimer = null
  }, SHOW_DELAY)
}

const hideTooltip = () => {
  if (showTimer) {
    clearTimeout(showTimer)
    showTimer = null
  }
  if (hideTimer) {
    clearTimeout(hideTimer)
  }
  hideTimer = setTimeout(() => {
    hovered.value = null
    hideTimer = null
  }, HIDE_DELAY)
}

const handleClickOutside = (event) => {
  if (!isOpen.value) {
    return
  }
  const el = dropdownRef.value
  if (el && !el.contains(event.target)) {
    isOpen.value = false
    hovered.value = null
  }
}

const updateMenuPosition = () => {
  if (!triggerRef.value) {
    return
  }
  const rect = triggerRef.value.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const gutter = 16
  const availableWidth = Math.max(viewportWidth - gutter * 2, MIN_MENU_WIDTH)
  const widthLimit = Math.min(MAX_MENU_WIDTH, availableWidth)
  const menuWidth = Math.min(Math.max(rect.width, MIN_MENU_WIDTH), widthLimit)
  let left = rect.left

  if (left + menuWidth + gutter > viewportWidth) {
    left = Math.max(gutter, viewportWidth - menuWidth - gutter)
  }

  menuStyles.value = {
    top: `${rect.bottom + 6}px`,
    left: `${left}px`,
    width: `${menuWidth}px`
  }
}

const handleViewportChange = () => {
  if (isOpen.value) {
    updateMenuPosition()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('resize', handleViewportChange)
  window.removeEventListener('scroll', handleViewportChange, true)
  if (showTimer) {
    clearTimeout(showTimer)
  }
  if (hideTimer) {
    clearTimeout(hideTimer)
  }
})

watch(isOpen, (open) => {
  if (open) {
    updateMenuPosition()
    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('scroll', handleViewportChange, true)
  } else {
    window.removeEventListener('resize', handleViewportChange)
    window.removeEventListener('scroll', handleViewportChange, true)
  }
})

watch(() => props.disabled, (disabled) => {
  if (disabled && isOpen.value) {
    isOpen.value = false
    hovered.value = null
  }
})
</script>

<style scoped>
.style-dropdown {
  position: relative;
  width: max-content;
}

.style-dropdown-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  height: 32px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 14px;
  color: #1f2937;
  transition: all 0.2s ease;
  box-shadow: none;
}

.style-dropdown-trigger:hover,
.style-dropdown-trigger.open {
  background: rgba(15, 23, 42, 0.03);
  border-color: #cbd5e1;
  color: #0f172a;
}

.style-icon {
  font-size: 14px;
  line-height: 1;
}

.style-text {
  line-height: 1;
}

.caret {
  font-size: 11px;
  opacity: 0.7;
}

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

.dropdown-fade-enter-to,
.dropdown-fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.style-dropdown-menu {
  position: fixed;
  background: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.16);
  min-width: 200px;
  max-width: min(280px, calc(100vw - 32px));
  padding: 6px;
  z-index: 1000;
}

.style-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  color: #333333;
  position: relative;
  transition: background 0.2s ease, color 0.2s ease;
}

.style-dropdown-item:hover,
.style-dropdown-item.active {
  background: #f5f5f5;
  color: #111111;
}

.item-icon {
  font-size: 16px;
  line-height: 1;
}

.item-text {
  flex: 1;
  line-height: 1.3;
}

.item-check {
  font-weight: 700;
  color: #0ea5e9;
}

.style-tooltip {
  position: absolute;
  top: 50%;
  left: calc(100% + 12px);
  transform: translateY(-50%);
  background: #111111;
  color: #ffffff;
  border-radius: 12px;
  padding: 14px 16px;
  max-width: 320px;
  min-width: 240px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
  z-index: 1100;
}

.tooltip-arrow {
  position: absolute;
  top: 50%;
  left: -6px;
  width: 12px;
  height: 12px;
  background: #111111;
  transform: translateY(-50%) rotate(45deg);
  border-top-left-radius: 3px;
}

.tooltip-header {
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 6px;
}

.tooltip-desc {
  font-size: 13px;
  color: #cfcfcf;
  line-height: 1.3;
}

.style-tooltip-pop-enter-active,
.style-tooltip-pop-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.style-tooltip-pop-enter-from,
.style-tooltip-pop-leave-to {
  opacity: 0;
  transform: translateY(calc(-50% + 6px));
}

.style-tooltip-pop-enter-to,
.style-tooltip-pop-leave-from {
  opacity: 1;
  transform: translateY(-50%);
}
</style>
