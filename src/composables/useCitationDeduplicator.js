import { ref } from 'vue'

export function useCitationDeduplicator() {
  const seenUrls = new Set()
  const seenTitles = new Set()

  const normalizeUrl = (url) => {
    try {
      const urlObj = new URL(url)
      urlObj.search = ''
      urlObj.hash = ''
      return urlObj.toString().replace(/\/$/, '').toLowerCase()
    } catch (e) {
      return url.toLowerCase()
    }
  }

  const normalizeTitle = (title) => {
    return title.toLowerCase().trim().replace(/\s+/g, ' ')
  }

  const isDuplicate = (url, title) => {
    const normalizedUrl = normalizeUrl(url)
    const normalizedTitle = normalizeTitle(title)
    
    if (seenUrls.has(normalizedUrl)) return true
    if (seenTitles.has(normalizedTitle)) return true
    
    return false
  }

  const addCitation = (url, title) => {
    seenUrls.add(normalizeUrl(url))
    seenTitles.add(normalizeTitle(title))
  }

  const reset = () => {
    seenUrls.clear()
    seenTitles.clear()
  }

  return {
    isDuplicate,
    addCitation,
    reset
  }
}
