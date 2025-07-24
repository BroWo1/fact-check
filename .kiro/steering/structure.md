# Project Structure

## Root Directory

```
├── src/                    # Source code
├── public/                 # Static assets
├── dist/                   # Build output
├── .kiro/                  # Kiro configuration
├── .env*                   # Environment variables
├── package.json            # Dependencies and scripts
├── vite.config.js          # Vite configuration
├── wrangler.jsonc          # Cloudflare deployment config
└── eslint.config.js        # ESLint configuration
```

## Source Structure (`src/`)

### Core Application Files
- `main.js` - Application entry point with Vue app setup
- `App.vue` - Root component (minimal, just router-view)
- `theme.js` - Ant Design theme configuration

### Components (`src/components/`)
- **Analysis Components**: `AnalysisProgress.vue`, `FactCheckResults.vue`, `ResearchResults.vue`
- **UI Controls**: `LanguageSelector.vue`, `ModeSelector.vue`, `SavedAnalysesDropdown.vue`
- **Utility Components**: `TableOfContents.vue`, `SessionRecoveryDialog.vue`, `NotificationPermissionBanner.vue`
- **Icons**: `src/components/icons/` - Custom SVG icon components

### Composables (`src/composables/`)
- `useFactCheck.js` - Main fact-checking logic and state management
- `useSavedAnalyses.js` - Analysis history management
- `useSessionRecovery.js` - Session persistence and recovery
- `useCitationDeduplicator.js` - Citation processing utilities

### Services (`src/services/`)
- `factCheckService.js` - HTTP API client with retry logic
- `websocketService.js` - WebSocket communication with polling fallback
- `sessionPersistenceService.js` - Local storage management
- `config.js` - Environment configuration
- `mockBackend.js` - Development/testing mock service

### Views (`src/views/`)
- `HomeView.vue` - Main application view with fact-checking interface
- `RouterView.vue` - Router wrapper component

### Internationalization (`src/i18n/`)
- `index.js` - I18n setup and configuration
- `locales/en.json` - English translations
- `locales/zh.json` - Chinese translations

### Assets (`src/assets/`)
- `main.css`, `base.css` - Global styles
- `fonts/` - Custom font files (LXGW series)
- `*.png`, `*.svg` - Application logos and images

## Public Assets (`public/`)
- `fonts/` - Font files accessible via URL
- `assets/` - Public images and logos
- `_redirects` - Netlify/Cloudflare redirect rules
- `favicon.ico`, `legiticon.ico` - Site icons

## Naming Conventions

- **Components**: PascalCase (e.g., `FactCheckResults.vue`)
- **Composables**: camelCase with `use` prefix (e.g., `useFactCheck.js`)
- **Services**: camelCase with descriptive suffix (e.g., `factCheckService.js`)
- **Files**: kebab-case for assets, camelCase for JS modules

## Import Patterns

- Use `@/` alias for `src/` directory imports
- Relative imports for same-directory files
- Absolute imports from `src/` for cross-directory references

## Component Organization

- Keep components focused and single-purpose
- Extract reusable logic into composables
- Use Ant Design Vue components as base UI elements
- Custom components follow Vue 3 Composition API patterns