# Analysis Summary API Specification

## Overview
This document specifies the API endpoint for generating analysis summaries that will be displayed in the saved analyses dropdown. The summary provides a concise description of the fact-check or research topic to help users quickly identify and select previous analyses.

## New API Endpoint

### Generate Summary
**Endpoint:** `POST /fact-check/{session_id}/generate-summary/`

**Purpose:** Generate a brief, user-friendly summary of an analysis for display in the saved analyses dropdown.

**Request Format:**
```json
{
  "original_claim": "string (required) - The original user input/claim",
  "content": "string (required) - The main analysis content (reasoning for fact-check, summary for research)",
  "mode": "string (required) - Either 'fact_check' or 'research'",
  "verdict": "string (optional) - The analysis verdict/conclusion"
}
```

**Response Format:**
```json
{
  "summary": "string - A concise 1-2 sentence summary of the analysis topic",
  "processing_time": "number (optional) - Time taken to generate summary in seconds"
}
```

**Example Request:**
```json
{
  "original_claim": "Drinking 8 glasses of water daily boosts brain function by 30%",
  "content": "This claim about water consumption and brain function lacks scientific evidence. Studies show hydration affects cognitive performance, but the specific claim of 30% improvement is unsupported by peer-reviewed research.",
  "mode": "fact_check",
  "verdict": "likely_false"
}
```

**Example Response:**
```json
{
  "summary": "Analysis of water consumption claim finds insufficient evidence for 30% brain function improvement.",
  "processing_time": 2.3
}
```

## Summary Generation Guidelines

The generated summary should:

1. **Be concise**: 1-2 sentences maximum (≤120 characters recommended)
2. **Be topic-focused**: Describe what the analysis is about, not the conclusion
3. **Be user-friendly**: Use clear, non-technical language
4. **Be mode-appropriate**:
   - **Fact-check mode**: Focus on what claim was evaluated
   - **Research mode**: Focus on what topic was researched
5. **Avoid repetition**: Don't repeat the original claim verbatim

## Integration Points

### Frontend Integration
- The summary is stored in the `summary` field of saved analyses
- Displayed in the `SavedAnalysesDropdown` component
- Generated automatically when saving new analyses (if sessionId is available)
- Falls back gracefully if summary generation fails

### Backend Integration
- Called automatically from the frontend when saving analysis results
- Should be fast (target <5 seconds response time)
- Can use the same session context as other analysis operations
- Should handle both fact-check and research content appropriately

## Error Handling

**Error Response Format:**
```json
{
  "error": "string - Error description",
  "error_code": "string (optional) - Machine-readable error code"
}
```

**Common Error Scenarios:**
- Invalid session ID (404)
- Missing required fields (400)
- Content too long or empty (400)
- Service temporarily unavailable (503)

## Implementation Notes

1. **Performance**: This endpoint should be optimized for speed as it's called during the analysis saving process
2. **Caching**: Consider caching summaries for identical content to improve performance
3. **Rate Limiting**: Apply appropriate rate limiting to prevent abuse
4. **Content Sanitization**: Ensure input content is properly sanitized before processing
5. **Language Support**: Should handle both English and Chinese content appropriately

## Testing Examples

### Fact-Check Example
```json
// Request
{
  "original_claim": "Vaccines contain microchips for government tracking",
  "content": "This conspiracy theory has been thoroughly debunked by medical experts and fact-checkers. Vaccines contain no electronic devices or tracking technology.",
  "mode": "fact_check",
  "verdict": "false"
}

// Expected Response
{
  "summary": "Fact-check of vaccine microchip conspiracy theory claim."
}
```

### Research Example
```json
// Request
{
  "original_claim": "What are the latest developments in renewable energy technology?",
  "content": "## Solar Power Advances\nRecent breakthroughs in perovskite solar cells...\n## Wind Energy Innovations\nNew turbine designs are increasing efficiency...",
  "mode": "research"
}

// Expected Response
{
  "summary": "Research on latest renewable energy technology developments and innovations."
}
```