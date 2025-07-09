#!/bin/bash

# Build the project
npm run build

# Deploy to Cloudflare Pages using wrangler pages
npx wrangler pages deploy dist --project-name fact-check
