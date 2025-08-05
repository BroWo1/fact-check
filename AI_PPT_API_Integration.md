# AI PPT Generator - API Integration Documentation

## Overview

This document outlines the API integration requirements for the AI PPT Generator feature. The frontend component `AIPPTGenerator.vue` has been implemented with mock data and needs to be connected to a backend API that can analyze research reports and generate PowerPoint presentations.

## Component Location

- **Component**: `src/components/AIPPTGenerator.vue`
- **Usage**: Similar to `AIQuickAsk.vue`, positioned as a sticky sidebar component

## API Endpoints Required

### 1. Generate PPT Endpoint

**Endpoint**: `POST /api/sessions/{sessionId}/generate-ppt`

**Request Body**:
```json
{
  "reportContent": "string", // The full research report content
  "slideCount": 7, // Number of slides to generate (default: 7)
  "theme": "professional" // Optional: presentation theme
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "pptId": "string", // Unique identifier for the generated PPT
    "createdAt": "ISO 8601 timestamp",
    "slides": [
      {
        "id": number,
        "title": "string",
        "content": "string" // HTML content for the slide
      }
    ]
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "PPT_GENERATION_FAILED",
    "message": "string"
  }
}
```

### 2. Get PPT Status (Optional - for polling during generation)

**Endpoint**: `GET /api/sessions/{sessionId}/ppt-status/{pptId}`

**Response**:
```json
{
  "status": "generating|completed|failed",
  "progress": number, // 0-100
  "message": "string" // Optional status message
}
```

## Frontend Integration Points

### 1. Service Integration

The component currently uses a mock implementation in the `generatePPT` method. Replace this with actual API calls:

```javascript
// Current mock implementation (line 77-116 in AIPPTGenerator.vue)
const generatePPT = async () => {
  // Replace this entire section with actual API integration
  // Use factCheckService pattern for consistent error handling
}
```

### 2. Required Service Method

Add to `src/services/factCheckService.js`:

```javascript
async generatePPT(sessionId, options = {}) {
  const endpoint = `${this.baseURL}/sessions/${sessionId}/generate-ppt`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reportContent: options.reportContent,
        slideCount: options.slideCount || 7,
        theme: options.theme || 'professional'
      })
    });

    if (!response.ok) {
      throw new Error(`PPT generation failed: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error?.message || 'PPT generation failed');
    }

    return result.data;
  } catch (error) {
    console.error('PPT generation error:', error);
    throw error;
  }
}
```

### 3. Component Integration

Update the `generatePPT` method in `AIPPTGenerator.vue`:

```javascript
const generatePPT = async () => {
  if (!props.sessionId) {
    message.error('No active session found. Please wait for the analysis to complete.');
    return;
  }

  isGenerating.value = true;

  try {
    const result = await factCheckService.generatePPT(props.sessionId, {
      reportContent: props.reportContent,
      slideCount: 7
    });
    
    savePPT(result);
    message.success('PPT generated successfully!');
  } catch (error) {
    console.error('PPT generation failed:', error);
    message.error(error.message || 'Failed to generate PPT');
  } finally {
    isGenerating.value = false;
  }
};
```

## Slide Content Requirements

### HTML Structure for Slides

Each slide's `content` field should contain complete HTML with inline styles:

```html
<div style="
  width: 100%; 
  height: 100%; 
  padding: 40px; 
  font-family: Arial, sans-serif;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
">
  <h1 style="color: #333; margin-bottom: 20px;">Slide Title</h1>
  <div style="flex: 1;">
    <!-- Slide content -->
  </div>
</div>
```

### Prompt for reference

Presentation Planning Guidelines
Overall Planning
Design a brief content overview, including core theme, key content, language style, and content approach, etc.
When user uploads a document to create a page, no additional information search is needed. processing will be directly based on the provided document content.
Determine appropriate number of slides.
If the content is too long, select the main information to create slides.
Define visual style based on the theme content and user requirements, like overall tone, color/font scheme, visual elements, Typography style, etc. Use a consistent color palette (preferably Material Design 3, low saturation) and font style throughout the entire design. Do not change the main color or font family from page to page.
Per-Page Planning
Page type specification (cover page, content page, chart page, etc.)
Content: core titles and essential information for each page. avoid overcrowding with too much information per slide.
Style: color, font, data visualizations & charts, animation effect(not must), ensure consistent styling between pages, pay attention to the unique layout design of the cover and ending pages like title-centered.

SLIDE Mode (1280×720)
Blanket rules

Make the slide strong visually appealing.

Usually when creating slides from materials, information on each page should be kept concise while focusing on visual impact. Use keywords not long sentences.

Maintain clear hierarchy. Emphasize the core points by using larger fonts or numbers. Visual elements of a large size are used to highlight key points, creating a contrast with smaller elements. But keep emphasized text size smaller than headings/titles.
Use the theme's auxiliary/secondary colors for emphasis. Limit emphasis to only the most important elements (no more than 2-3 instances per slide).
do not isolate or separate key phrases from their surrounding text.

When tackling complex tasks, first consider which frontend libraries could help you work more efficiently.

It is recommended to Use HTML5, ant-design-vue, Material Design and the necessary JavaScript.

Don't use Reveal.js
Layout rules
Avoid adding too much content for one page as they might exceed the designated high, especially for later slides. if there is too much content, consider splitting it into multiple pages.
Align blocks for visual coherence where appropriate, but allow blocks to shrink or grow based on content when it helps reduce empty space.
For visual variety and to avoid excessive modularity, you may use more diverse layout patterns beyond standard grids. Creative arrangements are encouraged as long as overall alignment and visual hierarchy are maintained.
The main content of the page should fill up the Min-height of the page, avoid the case where the footer moves up due to insufficient content height. You may consider using flex flex-col for the main container and flex-grow for the content part to fill up all extra space.
If there is excessive empty space or visual whitespace, you may enlarge the font size and module area appropriately to minimize empty gaps.
Strictly limit the number of content blocks or details per slide to prevent overflow. If the content exceeds the allowed height, automatically remove or summarize the lowest-priority items, but do not omit the key points of the content.
You may use ant-design-vue grid, flexbox, table/table-cell, unified min-height, or any suitable CSS technique to achieve this.
Within a single slide, keep the main module/font/color/... style consistent. you may use color or icon variations for emphasis. Module styles can vary between different slides, but maintain consistency in the theme color scheme or main style.
Rules of Cover slide (Page 1)

Layout
When you create the cover slide, It is recommended to try the following two layouts:
if you put the cover title centered, the title and subtitle must achieve both horizontal centering and vertical centering. As a best practice, add flex justify-center items-center ... to the main container, and set height: 100vh on the outermost slide element or the main flex container to ensure true vertical centering.
if you put the Cover title and Cover Subtitle on the left, they must achieve vertical centering. Several keywords or data from the report can be placed on the right, and they should be emphasized in bold. When there are many keywords,you should follow the layout design style of Bento Grid.
If the cover contains information such as the speaker and time, it should be aligned uniformly in the center/left.

Font size:
The size of Cover title should be 50-70px, adjusted according to the position and length of the Cover title.
the size of Cover subtitle should be 20px.

Color:
Adjust the purity and brightness of the main color to use it as the color of title and subtitle text.

Margin:
in the cover slide, the max width of the left-content is 70%.
The padding-left of the left-content is 70px. The padding-right of the Left-content is 20px.
The padding-left of the right-content is 20px. The padding-right of the Right-content is 70px.

Size of the slide:
The Cover slide should have a fixed width of 1280px and Height of 720px.

background image
Only one image, with an opaque/semi-transparent mask, set as background-image.
Style rules of Content Slides
Generally, maintain consistent design by using the same color/font palette according to the previous pages.

Color
It is recommended to use "Material Design 3" color palette with low saturation.
Adjust the purity and brightness of the main color to use it as an auxiliary color for the page.
Maintain consistent design by using the same color palette throughout the entire presentation, with one main color and at most 3 auxiliary colors.

Icon
Use libraries like "Material Design Icons" for icons by correctly adding link in the head section with proper HTML syntax.
MUST load Material Icons via a <link> tag, like <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
and <i class="material-icons">specific_icon_name</i>
Using <script> for icons is forbidden.
Use the theme color as the color of icons. Do not stretch icons.

Font
Do not decrease font size or spacing below the default design for the sake of fitting more content.If using multi-column or modular layouts, ensure all columns or blocks are visually aligned and appear equal in height for consistency.
Select a suitable and readable font from the Google Fonts library based on the theme style and user requirements.
If no specific style requested, recommendations fonts of serious scenes: English: Source Han Sans SC / Futura / Lenovo-XiaoxinChaokuGB. Chinese: Douyin Sans / DingTalk JinBuTi / HarmonyOS Sans SC. You may use different sytle fonts for entertaining and fun scenes.
You can use different fonts for headings and body text, but avoid using more than 3 fonts in a single PPT.

Readability of text:
Font size: the Page title should be 40px, and the main text should be 20px.
When overlaying text on an image, add a semi-transparent layer to ensure readability. The text and images need to have an appropriate contrast to ensure that the text on the images can be clearly seen.
Do not apply text-shadows or luminescence effects to the text.
Do not use images containing large amounts of text or charts as background images behind text content for readability.

Charts:
For large amounts of numerical data, consider creating visual charts and graphs. When doing so, leverage antV 5.0 or Chart.js or ECharts for effective data visualization: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
Data can refer to online chart components, and the style should be consistent with the theme. When there are many data charts, follow the layout design style of Bento Grid.

Image
Images are not mandatory for each page if not requested. Use images sparingly. Do not use images that are unrelated or purely decorative.
Unique: Each image must be unique across the entire presentation. Do not reuse images that have already been used in previous slides.
Quality: Prioritize clear, high-resolution images without watermarks or long texts.
Sizing: Avoid images smaller than 15% of the slide area. If you need logos/emblems, use text like "Your Logo" or relevant icons instead.
Do not fabricate/make up or modify image URLs. Directly and always use the URL of the searched image as an example illustration for the text, and pay attention to adjusting the image size.
If there is no suitable image available, simply do not put image.
When inserting images, avoiding inappropriate layouts, such as: do not place images directly in corners. do not place images on top of text to obscure it or overlap with other modules. do not arrange multiple images in a disorganized manner.
Constraints:

Dimension/Canvas Size
The slide CSS should have a fixed width of 1280px and min-Height of 720px to properly handle vertical content overflow. Do not set the height to a fixed value.
Please try to fit the key points within the 720px height. This means you should not add too much contents or boxes.
When using chart libraries, ensure that either the chart or its container has a height constraint configuration. For example, if maintainAspectRatio is set to false in Chart.js, please add a height to its container.

Do not truncate the content of any module or block. If content exceeds the allowed area, display as much complete content as possible per block and clearly indicate if the content is partially shown (e.g., with an ellipsis or "more" indicator), rather than clipping part of an item.

Please ignore all base64 formatted images to avoid making the HTML file excessively large.

Prohibit creating graphical timeline structures. Do not use any HTML elements that could form timelines(such as <div class="timeline">, <div class="connector">, horizontal lines, vertical lines, etc.).

Do not use SVG, connector lines or arrows to draw complex elements or graphic code such as structural diagrams/Schematic diagram/flowchart unless user required, use relevant searched-image if available.

Do not draw maps in code or add annotations on maps.
Deliverable Requirements
Prioritize following the user's specific requirements of sytle/color/font/... than the general guidelines mentioned above

## Error Handling

The component implements the following error handling:
- Session validation
- API error display via Ant Design messages
- Loading states during generation
- Graceful fallback for failed generations

## Local Storage

Generated PPTs are automatically saved to localStorage with the key pattern:
`ppt_{sessionId}`

This allows users to:
- Persist PPTs across browser sessions
- Quickly access previously generated presentations
- Clear saved data when needed

## Usage in Parent Components

To integrate the AIPPTGenerator into existing views:

```vue
<template>
  <div class="view-container">
    <!-- Other components -->
    
    <AIPPTGenerator
      :session-id="currentSessionId"
      :report-content="analysisResult"
      :visible="showPPTGenerator"
    />
  </div>
</template>

<script setup>
import AIPPTGenerator from '@/components/AIPPTGenerator.vue';
// ... other imports and logic
</script>
```

## Mobile Responsiveness

The component includes:
- Floating action button for mobile devices
- Full-screen modal overlay on small screens
- Responsive thumbnails and navigation
- Touch-friendly interface elements

## Performance Considerations

- PPT generation may take several seconds - implement proper loading states
- Consider implementing progress polling for long-running generations
- Optimize slide HTML content size for faster rendering
- Cache generated PPTs to avoid regeneration

## Future Enhancements

1. **Export Options**: Add PDF/PPTX export functionality
2. **Themes**: Multiple presentation themes/templates
3. **Customization**: User-editable slide content
4. **Sharing**: Share generated presentations via links
5. **Templates**: Pre-built slide templates for different report types