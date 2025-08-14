import jsPDF from 'jspdf'
import logoImage from '@/assets/itlookslegitTrans.png'
import { loadFontAsBase64, LXGW_WENKAI_CONFIG } from '@/utils/fontConverter'

class PDFService {
  constructor() {
    this.doc = null
    this.currentY = 40
    this.pageHeight = 270
    this.margins = {
      left: 20,
      right: 20,
      top: 40,
      bottom: 30
    }
    this.pageWidth = 170 // A4 width minus margins (210 - 20 - 20)
    this.tocItems = []
    this.currentPageNumber = 1
    this.citationCounter = 1
    this.citationMap = new Map()
    this.chineseFontLoaded = false
  }

  // Detect if text contains Chinese characters
  containsChinese(text) {
    if (!text) return false
    return /[\u4e00-\u9fff]/.test(text)
  }

  // Set appropriate font based on text content
  setAppropriateFont(text, size = 11, style = 'normal') {
    this.doc.setFontSize(size)
    
    if (this.containsChinese(text)) {
      // For Chinese text, we'll use a different approach
      // Since jsPDF doesn't natively support Chinese fonts without embedding
      // we'll warn the user and use the default font
      console.warn('Chinese characters detected in PDF. Consider using a different PDF library for better Chinese support.')
      this.doc.setFont('helvetica', style)
    } else {
      // Use default fonts for Latin text
      this.doc.setFont('helvetica', style)
    }
  }

  // Initialize fonts including Chinese support
  async initializeFonts() {
    try {
      console.log('Loading Chinese font for PDF...')
      
      // Load the Chinese font as base64
      const fontBase64 = await loadFontAsBase64(LXGW_WENKAI_CONFIG.path)
      
      if (fontBase64) {
        // Add the font to jsPDF
        this.doc.addFileToVFS(`${LXGW_WENKAI_CONFIG.name}.ttf`, fontBase64)
        this.doc.addFont(`${LXGW_WENKAI_CONFIG.name}.ttf`, LXGW_WENKAI_CONFIG.name, 'normal')
        
        // Also add bold variant (using the same font file)
        this.doc.addFont(`${LXGW_WENKAI_CONFIG.name}.ttf`, LXGW_WENKAI_CONFIG.name, 'bold')
        
        this.chineseFontLoaded = true
        console.log('Chinese font loaded successfully')
      } else {
        console.warn('Failed to load Chinese font, falling back to default fonts')
        this.chineseFontLoaded = false
      }
    } catch (error) {
      console.warn('Failed to initialize Chinese fonts:', error)
      this.chineseFontLoaded = false
    }
  }

  // Process text to handle Chinese characters
  processTextForPDF(text) {
    if (!text) return ''
    
    if (this.containsChinese(text)) {
      // For Chinese text, we have a few options:
      // 1. Keep the Chinese text but warn that it might not display correctly
      // 2. Replace with placeholders 
      // 3. Add a note about Chinese content
      
      console.warn('Processing text with Chinese characters for PDF')
      
      // Option 1: Keep the original text and let jsPDF handle it
      // This might result in boxes or missing characters, but it's better than corruption
      return text
      
      // Option 2: Add a fallback message (uncomment if needed)
      // return text + ' [Chinese content - may not display correctly in PDF]'
    }
    
    return text
  }

  async createPDF(reportData) {
    try {
      console.log('Creating PDF with data:', { 
        hasOriginalClaim: !!reportData.originalClaim,
        hasSummary: !!reportData.summary,
        sourcesCount: reportData.sources?.length || 0,
        summaryLength: reportData.summary?.length || 0
      })

      this.doc = new jsPDF()
      this.currentY = 40
      this.tocItems = []
      this.currentPageNumber = 1
      this.citationCounter = 1
      this.citationMap = new Map()

      // Initialize fonts (async)
      await this.initializeFonts()

      // Add modern header with logo placeholder
      this.addModernHeader(reportData)

      // Add title
      this.addTitle(reportData)

      // Introduction section removed per user request

      // Add main content sections
      this.addMainContent(reportData)

      // Add references if present
      if (reportData.sources && reportData.sources.length > 0) {
        this.addReferences(reportData.sources)
      }

      // Add page numbers
      this.addPageNumbers()

      console.log('PDF creation completed successfully')
      return this.doc
    } catch (error) {
      console.error('Error creating PDF:', error)
      throw new Error(`PDF creation failed: ${error.message}`)
    }
  }

  addModernHeader(reportData) {
    try {
      // Add the actual logo image
      this.doc.addImage(logoImage, 'PNG', this.margins.left, 15, 70, 15)
    } catch (error) {
      console.warn('Failed to add logo image to PDF:', error)
      // Continue without logo if image fails
    }

    // Add "Shallow Research" text in Crimson Text
    const headerText = 'Shallow Research'
    this.setAppropriateFont(headerText, 16, 'bold')
    this.doc.setTextColor(0, 0, 0) // Crimson color
    this.doc.text(headerText, this.margins.left + 75, 24)
    
    // Reset text color
    this.doc.setTextColor(0, 0, 0)

    this.currentY = 55
  }

  addTitle(reportData) {
    // Main title - clean, modern style
    // Use custom title if provided, otherwise use summary as title, fallback to original claim
    const title = reportData.customTitle || 
                  reportData.analysisTitle || 
                  this.formatTitle(reportData.originalClaim || 'Research Analysis Report')
    
    this.setAppropriateFont(title, 18, 'bold')
    const titleLines = this.doc.splitTextToSize(title, this.pageWidth)

    titleLines.forEach(line => {
      this.doc.text(line, this.margins.left, this.currentY)
      this.currentY += 10
    })

    this.currentY += 15
  }

  addIntroduction(reportData) {
    // Introduction heading
    this.doc.setFontSize(14)
    this.doc.setFont('helvetica', 'bold') // DM Sans fallback
    this.doc.text('Introduction', this.margins.left, this.currentY)
    this.currentY += 12

    // Introduction content
    this.doc.setFontSize(11)
    this.doc.setFont('helvetica', 'normal') // DM Sans fallback

    const introText = this.extractIntroduction(reportData.summary)
    const introLines = this.doc.splitTextToSize(introText, this.pageWidth)

    introLines.forEach(line => {
      if (this.currentY > this.pageHeight) {
        this.addNewPage()
      }
      this.addJustifiedText(line, this.margins.left, this.currentY, this.pageWidth)
      this.currentY += 6
    })
    this.currentY += 10
  }

  extractIntroduction(summary) {
    if (!summary) {
      return 'This report provides a comprehensive analysis of the given claim using advanced research and verification methods. The following sections detail our findings, methodology, and conclusions based on available evidence and expert sources.'
    }

    // Extract first substantial paragraph
    const paragraphs = summary.split('\n\n').filter(p => p.trim().length > 100)
    return this.cleanMarkdown(paragraphs[0] || summary.substring(0, 400))
  }

  addMainContent(reportData) {
    if (!reportData.summary) return

    const content = this.cleanMarkdown(reportData.summary)
    const sections = this.parseSections(content)

    sections.forEach(section => {
      if (this.currentY > this.pageHeight - 40) {
        this.addNewPage()
      }

      if (section.type === 'heading2') {
        // Main section headings - bold and enlarged like Introduction
        this.currentY += 10
        const processedHeading = this.processTextForPDF(section.content)
        this.setAppropriateFont(processedHeading, 16, 'bold')
        this.doc.text(processedHeading, this.margins.left, this.currentY)
        this.currentY += 15
      } else if (section.type === 'heading3') {
        // Subsection headings - bold
        this.currentY += 8
        const processedHeading = this.processTextForPDF(section.content)
        this.setAppropriateFont(processedHeading, 13, 'bold')
        this.doc.text(processedHeading, this.margins.left, this.currentY)
        this.currentY += 12
      } else if (section.type === 'bullet') {
        // Bullet points with proper formatting
        this.addBulletPoint(section.content)
      } else if (section.type === 'numbered') {
        // Numbered lists
        this.addNumberedItem(section.content, section.number)
      } else if (section.type === 'paragraph') {
        // Regular paragraphs
        this.addParagraph(section.content)
      } else if (section.type === 'table') {
        // Tables (if present in content)
        this.addTable(section.data)
      }
    })
  }

  parseSections(content) {
    const sections = []
    const lines = content.split('\n')
    let currentParagraph = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      const originalLine = lines[i]

      // Handle different heading formats
      if (line.startsWith('## ') || line.startsWith('###### ') || line.match(/^[A-Z][^a-z]*:?$/)) {
        // Flush any accumulated paragraph
        if (currentParagraph.length > 0) {
          sections.push({ type: 'paragraph', content: currentParagraph.join(' ').trim() })
          currentParagraph = []
        }
        
        let headingText = line
        if (line.startsWith('## ')) {
          headingText = line.substring(3).trim()
        } else if (line.startsWith('###### ')) {
          headingText = line.substring(7).trim()
        }
        
        sections.push({ type: 'heading2', content: headingText })
      } else if (line.startsWith('### ') || line.startsWith('#### ') || line.startsWith('##### ')) {
        // Flush any accumulated paragraph
        if (currentParagraph.length > 0) {
          sections.push({ type: 'paragraph', content: currentParagraph.join(' ').trim() })
          currentParagraph = []
        }
        
        let headingText = line
        if (line.startsWith('### ')) {
          headingText = line.substring(4).trim()
        } else if (line.startsWith('#### ')) {
          headingText = line.substring(5).trim()
        } else if (line.startsWith('##### ')) {
          headingText = line.substring(6).trim()
        }
        
        sections.push({ type: 'heading3', content: headingText })
      } else if (line.match(/^(\d+)\.\s+/) || line.match(/^\d+\)\s+/)) {
        // Flush any accumulated paragraph
        if (currentParagraph.length > 0) {
          sections.push({ type: 'paragraph', content: currentParagraph.join(' ').trim() })
          currentParagraph = []
        }
        
        const match = line.match(/^(\d+)[.)\s]+(.*)/) 
        if (match) {
          sections.push({
            type: 'numbered',
            number: match[1],
            content: match[2]
          })
        }
      } else if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ') || line.startsWith('→ ') || line.startsWith('▪ ')) {
        // Flush any accumulated paragraph
        if (currentParagraph.length > 0) {
          sections.push({ type: 'paragraph', content: currentParagraph.join(' ').trim() })
          currentParagraph = []
        }
        
        let bulletContent = line
        if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ')) {
          bulletContent = line.substring(2).trim()
        } else if (line.startsWith('→ ') || line.startsWith('▪ ')) {
          bulletContent = line.substring(2).trim()
        }
        
        sections.push({ type: 'bullet', content: bulletContent })
      } else if (line.trim() !== '') {
        // Accumulate paragraph content
        currentParagraph.push(line)
      } else if (line.trim() === '' && currentParagraph.length > 0) {
        // Empty line - flush paragraph
        sections.push({ type: 'paragraph', content: currentParagraph.join(' ').trim() })
        currentParagraph = []
      }
    }

    // Flush any remaining paragraph
    if (currentParagraph.length > 0) {
      sections.push({ type: 'paragraph', content: currentParagraph.join(' ').trim() })
    }

    return sections
  }

  addBulletPoint(text) {
    const processedText = this.processTextForPDF(text)
    this.setAppropriateFont(processedText, 11, 'normal')

    const bulletLines = this.doc.splitTextToSize(processedText, this.pageWidth - 15)

    bulletLines.forEach((line, index) => {
      if (this.currentY > this.pageHeight - 20) {
        this.addNewPage()
      }

      if (index === 0) {
        // Add bullet character
        this.doc.text('•', this.margins.left + 5, this.currentY)
      }

      this.doc.text(line, this.margins.left + 15, this.currentY)
      this.currentY += 6
    })
    this.currentY += 3
  }

  addNumberedItem(text, number) {
    const processedText = this.processTextForPDF(text)
    this.setAppropriateFont(processedText, 11, 'normal')

    const numberWidth = this.doc.getTextWidth(number + '.')
    const textLines = this.doc.splitTextToSize(processedText, this.pageWidth - 20)

    textLines.forEach((line, index) => {
      if (this.currentY > this.pageHeight - 20) {
        this.addNewPage()
      }

      if (index === 0) {
        // Add number
        this.doc.text(number + '.', this.margins.left + 5, this.currentY)
      }

      this.doc.text(line, this.margins.left + 20, this.currentY)
      this.currentY += 6
    })
    this.currentY += 3
  }

  addParagraph(text) {
    // Handle inline citations
    const citationProcessedText = this.processInlineCitations(text)
    // Process text for Chinese characters
    const processedText = this.processTextForPDF(citationProcessedText)
    
    this.setAppropriateFont(processedText, 11, 'normal')
    const textLines = this.doc.splitTextToSize(processedText, this.pageWidth)

    textLines.forEach((line, index) => {
      if (this.currentY > this.pageHeight - 20) {
        this.addNewPage()
      }

      // Justify all lines except the last one
      if (index < textLines.length - 1 && line.trim().length > this.pageWidth * 0.5) {
        this.addJustifiedText(line, this.margins.left, this.currentY, this.pageWidth)
      } else {
        this.doc.text(line, this.margins.left, this.currentY)
      }
      this.currentY += 6
    })
    this.currentY += 4
  }

  processInlineCitations(text) {
    // Simple citation processing - replace [1], [2] etc with superscript notation
    return text.replace(/\[(\d+)\]/g, (match, num) => {
      return ' ' + num + ' '
    })
  }

  addTable(tableData) {
    // Simple table implementation
    if (!tableData || !tableData.headers || !tableData.rows) return

    const colWidth = this.pageWidth / tableData.headers.length
    const rowHeight = 8

    // Table headers
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'bold') // DM Sans fallback
    this.doc.setFillColor(240, 240, 240)
    this.doc.rect(this.margins.left, this.currentY, this.pageWidth, rowHeight, 'F')

    tableData.headers.forEach((header, index) => {
      this.doc.text(header, this.margins.left + (index * colWidth) + 2, this.currentY + 5)
    })

    this.currentY += rowHeight

    // Table rows
    this.doc.setFont('helvetica', 'normal') // DM Sans fallback
    tableData.rows.forEach(row => {
      if (this.currentY > this.pageHeight - 20) {
        this.addNewPage()
      }

      row.forEach((cell, index) => {
        const cellText = String(cell)
        const cellLines = this.doc.splitTextToSize(cellText, colWidth - 4)
        this.doc.text(cellLines[0], this.margins.left + (index * colWidth) + 2, this.currentY + 5)
      })

      // Add row border
      this.doc.setDrawColor(200, 200, 200)
      this.doc.line(this.margins.left, this.currentY + rowHeight,
                   this.margins.left + this.pageWidth, this.currentY + rowHeight)

      this.currentY += rowHeight
    })

    this.currentY += 10
  }

  addReferences(sources) {
    if (this.currentY > this.pageHeight - 60) {
      this.addNewPage()
    }

    this.currentY += 10
    const referencesTitle = 'References'
    this.setAppropriateFont(referencesTitle, 14, 'bold')
    this.doc.text(referencesTitle, this.margins.left, this.currentY)
    this.currentY += 12

    sources.forEach((source, index) => {
      if (this.currentY > this.pageHeight - 25) {
        this.addNewPage()
      }

      const refNumber = (index + 1).toString()
      const refText = `${source.title || 'Untitled'}. Available at: ${this.truncateUrl(source.url)}`
      const processedRefText = this.processTextForPDF(refText)
      
      this.setAppropriateFont(processedRefText, 10, 'normal')
      const refLines = this.doc.splitTextToSize(processedRefText, this.pageWidth - 25)

      // Reference number with superscript style
      this.doc.setFontSize(8)
      this.doc.text(refNumber, this.margins.left + 5, this.currentY - 1)
      
      // Reset font for reference text
      this.setAppropriateFont(processedRefText, 10, 'normal')

      // Reference text with hanging indent
      refLines.forEach((line, lineIndex) => {
        this.doc.text(line, this.margins.left + 20, this.currentY)
        this.currentY += 5
      })
      this.currentY += 3
    })
  }

  addPageNumbers() {
    const totalPages = this.doc.internal.getNumberOfPages()

    for (let i = 1; i <= totalPages; i++) {
      this.doc.setPage(i)
      const pageText = i.toString()
      this.setAppropriateFont(pageText, 10, 'normal')
      this.doc.setTextColor(128, 128, 128)

      const pageWidth = this.doc.internal.pageSize.width
      const pageHeight = this.doc.internal.pageSize.height

      this.doc.text(pageText, pageWidth / 2, pageHeight - 15, { align: 'center' })

      // Reset text color
      this.doc.setTextColor(0, 0, 0)
    }
  }

  addNewPage() {
    this.doc.addPage()
    this.currentY = this.margins.top
    this.currentPageNumber++
  }

  addJustifiedText(text, x, y, maxWidth) {
    const words = text.trim().split(/\s+/)
    if (words.length <= 1) {
      this.doc.text(text, x, y)
      return
    }

    const spaceWidth = this.doc.getTextWidth(' ')
    const wordsWidth = words.reduce((sum, word) => sum + this.doc.getTextWidth(word), 0)
    const totalSpaceWidth = maxWidth - wordsWidth
    const spaceCount = words.length - 1
    const adjustedSpaceWidth = totalSpaceWidth / spaceCount

    let currentX = x
    words.forEach((word, index) => {
      this.doc.text(word, currentX, y)
      currentX += this.doc.getTextWidth(word)
      if (index < words.length - 1) {
        currentX += adjustedSpaceWidth
      }
    })
  }

  cleanMarkdown(text) {
    if (!text) return ''

    try {
      return text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        // Remove any potential control characters that might cause issues
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        // Keep Unicode characters as-is for better Chinese support
        // .normalize('NFD') // Removed - this can break Chinese characters
        // Keep heading markers for proper section parsing
        // .replace(/^#+\s+/gm, '') // Removed to preserve headings
    } catch (error) {
      console.warn('Error cleaning markdown text:', error)
      return text // Return original text if cleaning fails
    }
  }

  formatTitle(claim) {
    if (!claim) return 'Research Analysis Report'

    // Clean up the title
    const cleaned = claim.replace(/[?!.]+$/, '').trim()

    // Title case for professional appearance
    return cleaned.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' }
    return new Date(dateString || Date.now()).toLocaleDateString('en-US', options)
  }

  truncateUrl(url) {
    if (!url) return ''
    if (url.length > 80) {
      return url.substring(0, 77) + '...'
    }
    return url
  }

  downloadPDF(filename = 'research-report.pdf') {
    try {
      if (this.doc) {
        console.log('Attempting to download PDF:', filename)
        // Ensure filename has .pdf extension
        const pdfFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
        this.doc.save(pdfFilename)
        console.log('PDF download initiated successfully')
      } else {
        throw new Error('No PDF document available for download')
      }
    } catch (error) {
      console.error('Failed to download PDF:', error)
      throw new Error(`PDF download failed: ${error.message}`)
    }
  }
}

export default new PDFService()