# Implementation Plan

- [x] 1. Restructure header HTML layout for two-row grid system
  - Modify the header template in HomeView.vue to use CSS Grid layout
  - Create header-row-primary div for logo and hamburger button
  - Create header-row-secondary div for mobile navigation components
  - Move SavedAnalysesDropdown and LanguageSelector into the new secondary row
  - _Requirements: 1.1, 1.2, 2.2_

- [x] 2. Implement CSS styles for expandable header
  - Add base header styles with CSS transition for smooth height changes
  - Create .mobile-expanded class for expanded header state
  - Style .header-content with CSS Grid for two-row layout
  - Style .header-row-primary for logo and hamburger button alignment
  - Style .header-row-secondary for centered navigation components with proper spacing
  - _Requirements: 1.1, 2.1, 2.3, 2.4_

- [x] 3. Update mobile menu toggle functionality
  - Modify toggleMobileMenu function to work with new header expansion approach
  - Update mobile menu button click handler to toggle header expansion
  - Ensure proper CSS class application for mobile-expanded state
  - Test mobile menu button rotation animation with new layout
  - _Requirements: 1.1, 1.3, 3.3_

- [x] 4. Update click-outside detection for expanded header
  - Modify handleClickOutside function to work with new header structure
  - Update the click detection logic to properly identify header boundaries
  - Ensure clicking outside expanded header closes the mobile menu
  - Test click-outside behavior with various screen sizes
  - _Requirements: 1.4, 3.3_

- [x] 5. Remove old mobile dropdown styles and cleanup
  - Remove .header-menu-items-wrapper-mobile CSS styles
  - Remove dropdown-related positioning and shadow styles
  - Clean up any unused CSS classes related to old dropdown implementation
  - Remove dropdown-backdrop element and related styles
  - _Requirements: 1.1, 2.1_

- [x] 6. Implement responsive behavior and desktop preservation
  - Ensure desktop layout remains unchanged with horizontal navigation
  - Add media query handling for proper mobile/desktop switching
  - Test layout switching when resizing browser window
  - Ensure mobile menu auto-closes when switching to desktop viewport
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 7. Test and refine mobile navigation component functionality
  - Verify SavedAnalysesDropdown works correctly in expanded header
  - Test LanguageSelector functionality in new layout
  - Ensure component selection handlers properly close mobile menu
  - Test touch interaction and spacing for mobile devices
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 8. Add smooth transitions and visual polish
  - Implement CSS transitions for header height changes
  - Add fade-in animation for secondary row appearance
  - Ensure 60fps performance on mobile devices
  - Test animation smoothness across different mobile browsers
  - _Requirements: 2.3, 2.4_