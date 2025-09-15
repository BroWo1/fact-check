# Repository Guidelines

## Project Structure & Module Organization
- `src/` — application code (Vue 3).
  - `components/` (PascalCase `.vue`), `views/` (Page components), `composables/` (`useX.js`), `services/` (e.g., `factCheckService.js`, `pdfService.js`), `router/`, `i18n/`, `utils/`, `assets/`, `worker.js`.
- `public/` — static files copied as‑is.
- `dist/` — build output (gitignored).
- Root configs: `vite.config.js`, `eslint.config.js`, `wrangler.jsonc`, `.env*`.

## Build, Test, and Development Commands
- `npm run dev` — start Vite dev server at localhost with API proxy.
- `npm run build` — production build to `dist/`.
- `npm run preview` — preview the production build locally.
- `npm run lint` — run ESLint with Vue rules and auto‑fix.
- `npm run deploy` — build and deploy via Cloudflare Wrangler.

## Coding Style & Naming Conventions
- JavaScript + Vue SFCs; 2‑space indentation; semicolons optional (follow ESLint rules).
- Components: PascalCase file and component names (e.g., `SectionEditModal.vue`).
- Composables: `useThing.js` (e.g., `useFactCheck.js`).
- Services/Utils: lowerCamelCase filenames (e.g., `pdfService.js`).
- Imports: prefer `@/` alias for `src/` (configured in Vite).
- Run `npm run lint` before committing; keep diffs minimal and focused.

## Testing Guidelines
- No formal unit test harness yet. For changes with logic/UI impact:
  - Provide clear manual verification steps and, when helpful, screenshots/recordings.
  - Prefer small, isolated components and pure functions to ease future testing.

## Commit & Pull Request Guidelines
- Use Conventional Commits where practical: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.
- Commits should be scoped and descriptive (e.g., `feat: add session recovery dialog`).
- PRs must include: concise description, rationale, testing notes, and UI screenshots if applicable.
- Link related issues and call out breaking changes explicitly.

## Security & Configuration Tips
- Do not commit secrets. Use `.env.local` for developer overrides; see `.env*` for keys.
- API proxy and SPA routing are configured in `vite.config.js`.
- Deploy targets and asset serving are configured in `wrangler.jsonc` (`main: src/worker.js`).
- On production deploys, verify SPA routing works (no 404s on refresh) and APIs resolve.

