import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import zh from './locales/zh.json'

const messages = {
  en,
  zh
}

// Determine initial locale from localStorage or browser settings
function getInitialLocale() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem('language')
      if (saved === 'en' || saved === 'zh') return saved
    }
  } catch (_) {
    // ignore storage errors
  }
  // Fallback to browser language heuristic
  try {
    const navLang = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : 'en'
    return navLang && navLang.toLowerCase().startsWith('zh') ? 'zh' : 'en'
  } catch (_) {
    return 'en'
  }
}

const i18n = createI18n({
  locale: getInitialLocale(),
  fallbackLocale: 'en',
  messages,
  legacy: false,
  globalInjection: true
})

export default i18n
