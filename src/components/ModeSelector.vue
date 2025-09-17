<template>
  <div class="mode-selector">
    <!-- Desktop/Tablet: pill toggle -->
    <div class="mode-toggle" v-if="!isMobile">
      <!-- Fact Check -->
      <div 
        class="mode-wrapper" 
        @mouseenter="showTooltip('fact_check')" 
        @mouseleave="hideTooltip"
      >
        <button 
          :class="['mode-button', { active: mode === 'fact_check' }]"
          @click="$emit('update:mode', 'fact_check')"
        >
          <span class="mode-icon">🔍</span>
          <span class="mode-text">{{ t('mode.factCheck') }}</span>
        </button>
        <transition name="mode-tooltip-pop">
          <div v-if="hoveredMode === 'fact_check' && !isMobile" class="mode-tooltip">
            <div class="tooltip-arrow"></div>
            <div class="tooltip-header">{{ t('mode.factCheck') }}</div>
            <div class="tooltip-desc">{{ t('mode.factCheckDescription') }}</div>
            <div class="tooltip-sep"></div>
            <div class="tooltip-row">
              <div class="tooltip-row-text">Max Mode</div>
              <button class="switch" :class="{ on: maxMode }" @click.stop="toggleMaxMode">
                <span class="knob"></span>
              </button>
            </div>
            <div class="tooltip-hint">Enhanced analysis quality</div>
          </div>
        </transition>
      </div>

      <!-- Research -->
      <div 
        class="mode-wrapper" 
        @mouseenter="showTooltip('research')" 
        @mouseleave="hideTooltip"
      >
        <button 
          :class="['mode-button', { active: mode === 'research' }]"
          @click="$emit('update:mode', 'research')"
        >
          <span class="mode-icon">📚</span>
          <span class="mode-text">{{ t('mode.research') }}</span>
        </button>
        <transition name="mode-tooltip-pop">
          <div v-if="hoveredMode === 'research' && !isMobile" class="mode-tooltip">
            <div class="tooltip-arrow"></div>
            <div class="tooltip-header">{{ t('mode.research') }}</div>
            <div class="tooltip-desc">{{ t('mode.researchDescription') }}</div>
            <div class="tooltip-sep"></div>
            <div class="tooltip-row">
              <div class="tooltip-row-text">Max Mode</div>
              <button class="switch" :class="{ on: maxMode }" @click.stop="toggleMaxMode">
                <span class="knob"></span>
              </button>
            </div>
            <div class="tooltip-hint">Enhanced analysis quality</div>
          </div>
        </transition>
      </div>

      <!-- More / Define -->
      <div 
        class="lite-dropdown mode-wrapper" 
        ref="moreRef"
      >
        <button 
          :class="['mode-button', 'more-button', { active: mode === 'define' || isMoreOpen }]"
          @click="toggleMore"
        >
          <span v-if="showMoreIcon" class="mode-icon">{{ moreIcon }}</span>
          <span class="mode-text">{{ moreText }}</span>
          <span class="caret">▼</span>
        </button>
        <div v-if="isMoreOpen" class="more-menu">
          <div class="more-item" @mouseenter="showTooltip('define')" @mouseleave="hideTooltip" @click="selectDefine">
            <span class="item-icon">🧠</span>
            <span class="item-text">{{ t('mode.define') }}</span>
            <transition name="mode-tooltip-pop">
              <div v-if="hoveredMode === 'define' && !isMobile" class="mode-tooltip mode-tooltip--right">
                <div class="tooltip-arrow"></div>
                <div class="tooltip-header">{{ t('mode.define') }}</div>
                <div class="tooltip-desc">{{ t('mode.defineDescription') }}</div>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile: single custom dropdown -->
    <div class="mode-toggle-mobile" v-else ref="moreRef">
      <button :class="['mode-button', 'dropdown-button', { open: isMoreOpen }]" @click="toggleMore">
        <span class="mode-icon">{{ currentModeIcon }}</span>
        <span class="mode-text">{{ currentModeText }}</span>
        <span class="caret">▼</span>
      </button>
      <transition name="dropdown-fade">
        <div v-if="isMoreOpen" class="more-menu mobile-menu">
          <div class="more-item" :class="{ active: mode === 'fact_check' }" @click.stop="$emit('update:mode', 'fact_check'); isMoreOpen = false; moreToolsOpen = false">
            <span class="item-icon">🔍</span>
            <span class="item-text">{{ t('mode.factCheck') }}</span>
            <span v-if="mode === 'fact_check'" class="item-check">✓</span>
          </div>
          <div class="more-item" :class="{ active: mode === 'research' }" @click.stop="$emit('update:mode', 'research'); isMoreOpen = false; moreToolsOpen = false">
            <span class="item-icon">📚</span>
            <span class="item-text">{{ t('mode.research') }}</span>
            <span v-if="mode === 'research'" class="item-check">✓</span>
          </div>
          <div class="more-item more-toggle" @click.stop="toggleMoreTools">
            <span class="item-icon">⋯</span>
            <span class="item-text">{{ t('mode.moreTools') }}</span>
            <span class="caret" :class="{ open: moreToolsOpen }">▼</span>
          </div>
          <transition name="dropdown-fade">
            <div v-if="moreToolsOpen" class="more-submenu">
              <div class="more-item" :class="{ active: mode === 'define' }" @click.stop="selectDefine(); moreToolsOpen = false">
                <span class="item-icon">🧠</span>
                <span class="item-text">{{ t('mode.define') }}</span>
                <span v-if="mode === 'define'" class="item-check">✓</span>
              </div>
            </div>
          </transition>
        </div>
      </transition>
    </div>
    <p class="mode-description">
      {{ modeDescription }}
    </p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  mode: {
    type: String,
    default: 'fact_check'
  }
})

const emit = defineEmits(['update:mode'])

const isMoreOpen = ref(false)
const moreRef = ref(null)
const hoveredMode = ref(null)
let showTimer = null
let hideTimer = null
let resizeHandler = null
let storageHandler = null
const isMobile = ref(false)
const maxMode = ref(false)
const moreToolsOpen = ref(false)

const toggleMore = () => {
  isMoreOpen.value = !isMoreOpen.value
  if (!isMoreOpen.value) moreToolsOpen.value = false
}

const selectDefine = () => {
  emit('update:mode', 'define')
  isMoreOpen.value = false
  moreToolsOpen.value = false
}

const handleClickOutside = (e) => {
  if (!isMoreOpen.value) return
  const el = moreRef.value
  if (el && !el.contains(e.target)) {
    isMoreOpen.value = false
    moreToolsOpen.value = false
  }
}
const toggleMoreTools = () => {
  moreToolsOpen.value = !moreToolsOpen.value
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  // Detect mobile (basic)
  resizeHandler = () => { isMobile.value = window.innerWidth < 900 }
  resizeHandler()
  window.addEventListener('resize', resizeHandler)
  // Load max mode setting
  try {
    const saved = localStorage.getItem('settings-max-mode')
    if (saved !== null) maxMode.value = JSON.parse(saved)
  } catch {
    // ignore
  }
  // Sync with Settings via storage listener
  storageHandler = () => {
    try {
      const saved = localStorage.getItem('settings-max-mode')
      if (saved !== null) maxMode.value = JSON.parse(saved)
    } catch {
      // ignore
    }
  }
  window.addEventListener('storage', storageHandler)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
  if (storageHandler) window.removeEventListener('storage', storageHandler)
  if (showTimer) clearTimeout(showTimer)
  if (hideTimer) clearTimeout(hideTimer)
})

const modeDescription = computed(() => {
  if (props.mode === 'fact_check') return t('mode.factCheckDescription')
  if (props.mode === 'research') return t('mode.researchDescription')
  if (props.mode === 'define') return t('mode.defineDescription')
  return ''
})

// Dynamic label/icon for the More pill (shows selected lite mode)
  const moreIcon = computed(() => props.mode === 'define' ? '🧠' : '')
  const showMoreIcon = computed(() => props.mode === 'define')
  const moreText = computed(() => props.mode === 'define' ? t('mode.define') : t('mode.moreTools'))
  
  // Mobile dropdown helpers
  const currentModeIcon = computed(() => {
    if (props.mode === 'fact_check') return '🔍'
    if (props.mode === 'research') return '📚'
    if (props.mode === 'define') return '🧠'
    return ''
  })
  const currentModeText = computed(() => {
    if (props.mode === 'fact_check') return t('mode.factCheck')
    if (props.mode === 'research') return t('mode.research')
    if (props.mode === 'define') return t('mode.define')
    return ''
  })

// Tooltip helpers
const SHOW_DELAY = 300
const HIDE_DELAY = 100

const showTooltip = (which) => {
  // Cancel pending hide and schedule show
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
  if (hoveredMode.value === which) return
  if (showTimer) clearTimeout(showTimer)
  showTimer = setTimeout(() => {
    hoveredMode.value = which
    showTimer = null
  }, SHOW_DELAY)
}

const hideTooltip = () => {
  // Cancel pending show and schedule hide
  if (showTimer) { clearTimeout(showTimer); showTimer = null }
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    hoveredMode.value = null
    hideTimer = null
  }, HIDE_DELAY)
}

// Toggle Max Mode and persist
const toggleMaxMode = () => {
  maxMode.value = !maxMode.value
  try {
    localStorage.setItem('settings-max-mode', JSON.stringify(maxMode.value))
    // Dispatch storage-like event so other parts can react immediately
    window.dispatchEvent(new Event('storage'))
  } catch {
    // ignore
  }
}

</script>

<style scoped>

.mode-selector {
  margin-bottom: 20px;
  text-align: center;
}

.mode-toggle {
  display: inline-flex;
  background: #f5f5f5;
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 12px;
  border: 1px solid #e8e8e8;
}

.mode-toggle-mobile {
  display: inline-block;
  margin: 0 auto 12px;
  position: relative;
  background: #f5f5f5;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  padding: 4px;
}

.mode-wrapper {
  position: relative;
}

.mode-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  height: 44px; /* enforce consistent height across pills */
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Crimson Text', serif;
  font-size: 14px;
  font-weight: 600;
  color: #666666;
  min-width: 120px;
  justify-content: center;
}

.mode-button.active {
  background: #000000;
  color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.mode-button:hover:not(.active) {
  background: #eaeaea;
  color: #000000;
}

.mode-icon {
  font-size: 16px;
}

.mode-text {
  font-size: 14px;
}

.mode-description {
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 13px;
  color: #888888;
  margin: 0;
  max-width: 500px;
  margin: 0 auto;
  line-height: 1.4;
}

.lite-dropdown {
  margin-left: 8px;
  display: flex;
  align-items: center;
  position: relative;
}

.more-button .caret { margin-left: 6px; font-size: 12px; }

/* Make the More pill shorter/narrower */
.mode-button.more-button {
  min-width: auto;
  padding: 12px 14px; /* keep height consistent */
}

.dropdown-button {
  width: auto;
  justify-content: space-between;
  padding: 12px 14px;
  background: #000000;
  color: #ffffff;
}
.mode-toggle-mobile .dropdown-button:hover {
  background: #000000;
  color: #ffffff;
}
.dropdown-button .caret { margin-left: 6px; font-size: 12px; opacity: 0.9; transition: transform 0.15s ease; }
.dropdown-button.open .caret { transform: rotate(180deg); }

.more-menu {
  position: absolute;
  top: 44px;
  left: 0;
  background: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  box-shadow: 0 6px 16px rgba(0,0,0,0.12);
  min-width: 180px;
  z-index: 1000;
  padding: 6px;
}

.mobile-menu {
  left: 0;
  top: calc(100% + 6px);
  min-width: 220px;
  width: max-content;
}

.more-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
}
.more-toggle .caret {
  margin-left: auto;
  font-size: 12px;
  opacity: 0.9;
  transition: transform 0.15s ease;
}
.more-toggle .caret.open {
  transform: rotate(180deg);
}

.more-submenu {
  padding-left: 28px;
  padding-top: 6px;
}

.more-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-family: 'Crimson Text', serif;
  color: #333;
  position: relative; /* anchor for right-floating tooltip */
}

.more-item:hover {
  background: #f5f5f5;
}

.more-item.active {
  background: #f2f2f2;
  font-weight: 600;
}

.more-item .item-check {
  margin-left: auto;
  color: #0ea5e9;
  font-weight: 700;
}

@media (max-width: 480px) {
  .mode-button {
    min-width: 100px;
    padding: 10px 16px;
  }
  
  .mode-text {
    font-size: 13px;
  }
  
  .mode-description {
    font-size: 12px;
  }
}

/* Perplexity-style tooltip */
.mode-tooltip {
  position: absolute;
  top: 52px;
  left: 0;
  background: #111;
  color: #fff;
  border-radius: 12px;
  padding: 14px 16px;
  min-width: 260px;
  max-width: 320px;
  z-index: 999;
  box-shadow: 0 10px 24px rgba(0,0,0,0.35);
  transition: opacity 0.16s ease, transform 0.16s ease;
}

/* Right-floating variant for items inside dropdown */
.mode-tooltip.mode-tooltip--right {
  top: 50%;
  left: calc(100% + 10px);
  transform: translateY(-50%);
}

.mode-tooltip .tooltip-arrow {
  position: absolute;
  top: -6px; /* default under button */
  left: 18px;
  width: 12px;
  height: 12px;
  background: #111;
  transform: rotate(45deg);
  border-top-left-radius: 3px;
}

.mode-tooltip.mode-tooltip--right .tooltip-arrow {
  top: 50%;
  left: -6px;
  transform: translateY(-50%) rotate(45deg);
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

.tooltip-sep {
  height: 1px;
  background: #2a2a2a;
  margin: 10px 0;
}

.tooltip-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.tooltip-row-text { font-size: 13px; }

.tooltip-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #9e9e9e;
}

/* Minimal switch */
.switch {
  width: 42px;
  height: 24px;
  border-radius: 999px;
  background: #3a3a3a;
  border: 1px solid #2a2a2a;
  position: relative;
  cursor: pointer;
}
.switch .knob {
  position: absolute;
  top: 50%;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #cfcfcf;
  transform: translateY(-50%);
  transition: left 0.15s ease, background 0.15s ease;
}
.switch.on { background: #0ea5e9; border-color: #0284c7; }
.switch.on .knob { left: 21px; background: #fff; }

/* Upward appear animation */
.mode-tooltip-pop-enter-active, .mode-tooltip-pop-leave-active { 
  transition: opacity 0.16s ease, transform 0.16s ease; 
}
.mode-tooltip-pop-enter-from, .mode-tooltip-pop-leave-to { 
  opacity: 0; 
  transform: translateY(6px); 
}
.mode-tooltip-pop-enter-to, .mode-tooltip-pop-leave-from { 
  opacity: 1; 
  transform: translateY(0); 
}

/* Mobile dropdown animation */
.dropdown-fade-enter-active, .dropdown-fade-leave-active { 
  transition: opacity 0.16s ease, transform 0.16s ease; 
}
.dropdown-fade-enter-from, .dropdown-fade-leave-to { 
  opacity: 0; 
  transform: translateY(6px); 
}
.dropdown-fade-enter-to, .dropdown-fade-leave-from { 
  opacity: 1; 
  transform: translateY(0); 
}
</style>
