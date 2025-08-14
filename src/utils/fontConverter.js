// Utility to convert TTF font to base64 for jsPDF
export async function loadFontAsBase64(fontPath) {
  try {
    const response = await fetch(fontPath)
    const arrayBuffer = await response.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    
    // Convert to base64
    let binary = ''
    uint8Array.forEach(byte => {
      binary += String.fromCharCode(byte)
    })
    
    return btoa(binary)
  } catch (error) {
    console.error('Failed to load font:', error)
    return null
  }
}

// Import font as URL
import fontUrl from '@/assets/fonts/LXGWWenKai-Regular.ttf'

// Font configuration for LXGW WenKai
export const LXGW_WENKAI_CONFIG = {
  name: 'LXGWWenKai',
  path: fontUrl,
  format: 'truetype'
}