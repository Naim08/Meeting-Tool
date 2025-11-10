# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cluely is an AI meeting assistant web application built with Next.js 15.5.5, React 19, and Tailwind CSS 4. The application provides live meeting notes, instant answers, and real-time insights during calls. This is a client-side focused marketing website showcasing the product.

## Tech Stack

- **Framework**: Next.js 15.5.5 with App Router and Turbopack
- **React**: 19.1.0
- **TypeScript**: v5 with strict mode enabled
- **Styling**: Tailwind CSS 4 with PostCSS
- **Fonts**: Custom fonts (Geist, EB Garamond, Forma) with fallbacks
- **Linting**: ESLint with Next.js config

## Common Development Commands

```bash
# Development server (uses Turbopack)
npm run dev
# or
bun dev

# Production build (uses Turbopack)
npm run build
# or
bun run build

# Start production server
npm start

# Lint code
npm run lint
# or
eslint
```

## Project Structure

```
cluely-react-app/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout with metadata, fonts, and SEO
│   ├── page.tsx           # Homepage with hero, demo sections
│   ├── pricing/           # Pricing page
│   └── globals.css        # Global styles, font-faces, animations
├── components/            # Reusable React components
│   ├── ChatDemo.tsx
│   ├── DashboardView.tsx
│   ├── InvisibleSlider.tsx
│   └── NeverInYourWay.tsx
├── public/                # Static assets
│   ├── fonts/            # Custom font files
│   ├── images/           # Image assets
│   ├── videos/           # Video assets
│   └── favicon/          # Favicon variants (light/dark)
└── tsconfig.json         # TypeScript configuration
```

## Architecture Patterns

### Component Organization
- Page components live in `app/` directory following Next.js App Router conventions
- Reusable UI components are in `components/` directory
- All components use TypeScript with proper typing
- Client-side interactive components use `'use client'` directive

### Styling Approach
- Tailwind CSS utility classes for styling
- Custom CSS animations defined in `globals.css` (e.g., `fadeInOut1-4` for marquee text, `marqueeVideoFadeIn`)
- Custom utility classes for fonts (`.font-forma`, `.font-eb-garamond`)
- Custom color utilities (`.text-gray-40`, `.text-gray-80`, `.text-gray-90`)
- Responsive design with mobile-first approach using Tailwind breakpoints

### SEO and Metadata
- Comprehensive metadata configured in `app/layout.tsx`
- Open Graph and Twitter Card support
- Preloaded assets for performance
- Light/dark mode favicon support
- Web app manifest at `/public/manifest.json`

### Path Aliases
- `@/*` maps to the root directory (configured in tsconfig.json)
- Import components using: `import Component from '@/components/Component'`

## Key Features to Note

1. **Turbopack**: Both dev and build use `--turbopack` flag for faster bundling
2. **Font Loading**: Custom font-face declarations in globals.css with font-display: swap
3. **Dark Mode**: Color scheme preference support with light/dark favicons
4. **Custom Animations**: CSS keyframe animations for text marquees and fade-ins
5. **Video Handling**: Safari autoplay fix script in layout.tsx for `.fix-safari-autoplay` videos

## Development Notes

- The homepage (`app/page.tsx`) is very large and contains extensive inline JSX
- Components are primarily presentational with minimal state management
- The pricing page uses React state for billing cycle toggle (monthly/annually)
- Hard-coded CSS file paths in layout.tsx (lines 46-49) - these may need updating if build outputs change
- TypeScript target is ES2017 with strict mode enabled
- Module resolution uses "bundler" mode for Next.js compatibility

## Build and Deployment

- Production builds use Next.js static generation where possible
- Assets are optimized and bundled via Turbopack
- The app is configured for deployment to platforms like Vercel (as suggested by README)
