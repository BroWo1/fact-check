# Technology Stack

## Core Framework & Build System

- **Vue 3** with Composition API
- **Vite** as build tool and development server
- **Vue Router 4** for client-side routing with history mode
- **Vue I18n 9** for internationalization

## UI & Styling

- **Ant Design Vue 4** as primary component library
- **Custom CSS** with CSS variables for theming
- **Custom Fonts**: LXGW series fonts (NeoZhiSong, WenKai) for Chinese typography

## State Management & Data Flow

- **Vue Composition API** with custom composables (no Vuex/Pinia)
- **Axios** for HTTP requests with interceptors and retry logic
- **WebSocket** communication with polling fallback
- **Local Storage** for session persistence

## Key Libraries

- `marked` - Markdown parsing
- `html2canvas` - Screenshot/image capture functionality
- `uuid` - Unique identifier generation
- `axios` - HTTP client

## Development Tools

- **ESLint** with Vue 3 configuration and auto-fix
- **Vite Dev Tools** for Vue debugging
- **Wrangler** for Cloudflare Pages deployment

## Common Commands

```bash
# Development
npm install          # Install dependencies
npm run dev         # Start dev server (http://localhost:5173)
npm run build       # Production build + clean redirects
npm run preview     # Preview production build
npm run lint        # ESLint with auto-fix

# Deployment
npm run deploy      # Build and deploy to Cloudflare Pages
```

## Configuration

- **API Proxy**: `/api` routes proxy to `https://server.itlookslegit.com`
- **Environment Variables**: 
  - `VITE_API_URL` (defaults to `/api`)
  - `VITE_WS_URL` (defaults to `ws://localhost:8000/ws`)
- **Deployment**: Cloudflare Pages via `wrangler.jsonc`

## Architecture Patterns

- **Service Layer**: Centralized API communication in `src/services/`
- **Composables**: Reusable reactive logic (fact-checking, session management)
- **Component Composition**: Small, focused Vue components
- **Error Handling**: Retry logic with exponential backoff