# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production (includes cleaning redirects)
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint with auto-fix
- `npm run deploy` - Build and deploy to Cloudflare Pages using Wrangler

### Installation
- `npm install` - Install all dependencies

## Architecture Overview

This is a Vue 3 fact-checking application built with Vite that provides real-time fact-checking and research capabilities through a backend API.

### Core Architecture
- **Frontend**: Vue 3 SPA with Ant Design Vue components
- **Build Tool**: Vite with Vue plugin and dev tools
- **State Management**: Vue Composition API with composables
- **Routing**: Vue Router with history mode
- **Internationalization**: Vue I18n (English/Chinese support)
- **Backend Communication**: REST API + WebSocket with polling fallback
- **Deployment**: Cloudflare Pages

### Key Directories
- `src/components/` - Vue components including progress tracking, results display, and UI controls
- `src/composables/` - Reusable composition functions for fact-checking logic, session management, and citation handling
- `src/services/` - API communication layer, WebSocket service, and configuration
- `src/i18n/` - Internationalization files (en/zh locales)
- `src/views/` - Route-level components

### Service Layer
- **factCheckService.js** - Main API client with retry logic, handles fact-checking sessions
- **websocketService.js** - Real-time progress updates with fallback to polling
- **sessionPersistenceService.js** - Session recovery and local storage management
- **mockBackend.js** - Development/testing backend simulation

### Key Features
- **Dual Modes**: Fact-check mode and research mode
- **Session Recovery**: Automatic recovery of interrupted sessions
- **Real-time Progress**: WebSocket + polling hybrid for progress tracking
- **File Upload**: Image upload support for fact-checking
- **Internationalization**: Full i18n support with language switching
- **Session Management**: Save/load analysis history

### Configuration
- API endpoint configured via `VITE_API_URL` (defaults to `/api`)
- WebSocket endpoint via `VITE_WS_URL` (defaults to `ws://localhost:8000/ws` in dev)
- Vite proxy forwards `/api` requests to `https://server.itlookslegit.com`
- Cloudflare deployment configured via `wrangler.jsonc`

### State Management Pattern
Uses Vue Composition API with the `useFactCheck` composable as the central state manager:
- Reactive progress tracking with step-by-step updates
- Error handling with retry logic and graceful degradation
- Session persistence across browser refreshes
- WebSocket communication with polling fallback

### Testing & Development Notes
- No specific test framework configured - check if tests exist before assuming testing approach
- ESLint configured for Vue 3 with auto-fix on lint command
- Development server includes proxy for API calls and history API fallback for SPA routing
- Uses custom fonts (LXGW series) stored in both `public/fonts/` and `src/assets/fonts/`