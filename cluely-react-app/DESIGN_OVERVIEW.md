# Cluely React App – Design Overview

## Global Layout & Theming
- `app/layout.tsx` defines shared metadata, favicon set, and preloads brand assets. Every page is wrapped in `SupabaseProvider`, allowing Supabase session checks in client components.
- Global fonts are registered in `app/globals.css`: display headlines use **EB Garamond**, body copy uses **Geist**, and large marquee numerals use the custom `forma` family. Fallback stacks and size-adjust settings keep typography consistent.
- The site relies on Tailwind via the new `@import "tailwindcss";` syntax. Custom utilities are added for gray tones, tight line heights, and hero background imagery.
- Background palette leans on soft gradients (`#DDE2EE`, `#BBC5DD`) with deep purple overlays in hero areas. Light mode is the default; dark mode adjusts CSS variables but isn’t fully themed.

## Site Frame & Navigation
- A translucent header is positioned absolutely on the home page, with variants on pricing/auth routes. Navigation exposes **Pricing**, **Blog**, and auth links; CTAs reuse the signature “purple-gradient-button” pill with blurred border glow.
- Mobile view shows a hamburger trigger while desktop displays inline links. Logo and CTAs stay white to contrast against the gradient hero.

## Home Page Structure (`app/page.tsx`)
- **Hero**: full-bleed background image (`hero-v2`) with large Garamond headlines stacked over a chat demo. The hero includes:
  - CTA buttons (“Sign Up”, “Get Interview Copilot for desktop”) with decorative shine overlays.
  - A looping video background and a `ChatDemo` overlay simulating an interviewer question and AI response.
  - Mobile devices display a square looping video beneath the chat UI.
- **Feature Focus**: dual-column section (“People search” / “Follow-up email”) with autoplaying videos masked inside rounded cards, describing pre/post meeting assistance.
- **Marquee / Value Proposition**: large inset-text videos spelling out phrases (“28 notetakers in realtime”) using SVG masks and looping animation.
- **Proof Sections**: alternating content blocks show stats, customer logos, and narrative copy about live assistance vs. note-taking competitors.
- **Interactive Components**:
  - `<InvisibleSlider />`: before/after slider demonstrating “Visible to you” overlays while remaining hidden on screen shares. Uses draggable handle and keyboard controls.
  - `<NeverInYourWay />`: rotating carousel of product states with auto-play and manual controls styled as keyboard buttons.
  - `<DashboardView />`: mock application shell portraying history list, transcript playback, and multi-column layout inside a glassmorphism frame.
- **Additional Content**: sections for FAQs, testimonials, enterprise CTA, and download prompts reuse gradient backgrounds, masked videos, and typographic emphasis on empathy for interviewees.

## Pricing Page (`app/pricing/page.tsx`)
- Shares the same hero background as auth pages, with a translucent navigation bar.
- Opens with a typographic headline and gradient icon button (“Start for free”), then a three-column pricing grid (Weekly, Free Trial, Pro).
- Each card uses white backgrounds, subtle drop shadows, and checkmark lists. Subscribe buttons pull Stripe-hosted links from `process.env.NEXT_PUBLIC_STRIPE_*`.

## Authentication Pages (`app/login/page.tsx`, `app/signup/page.tsx`)
- Both render over the purple hero gradient, keeping the main content in a centered white card with rounded corners and drop shadows.
- Header navigation mirrors the home page. Forms rely on Supabase:
  - Login signs into the primary Supabase project (`useSupabase`).
  - Signup performs a two-step flow hitting `supabaseDb1` before the main Supabase project, with messaging for desktop sync parity.
- Buttons reuse the glowing purple gradient component; validation states display inline error and success messaging.

## Shared Components & Interactions
- **ChatDemo**: animates a typed question/answer loop with timed state transitions. Pointer events are disabled (`pointer-events-none`) since it’s a purely illustrative overlay.
- **InvisibleSlider**: uses mouse + keyboard controls to move a masked overlay, demonstrating hidden UI surfaces. Highlights the “Visible to you” region with a neon green outline.
- **NeverInYourWay**: auto-rotating background with overlay cards and physical keypad controls to emphasize quick window repositioning.
- **DashboardView**: interactive mock showing conversation history, transcript timeline, and summarised insights aligned with product value.

## Assets & Styling
- `public/` hosts high-resolution images, masked SVG wordmarks, and multiple MP4/WebM videos for feature loops. Hero videos include Safari-focused `hv1` encodes to avoid autoplay issues (paired with a script forcing `play()` on visibility change).
- Static CSS files (`/static/css/*.css`) are linked in the root layout to replicate legacy styling without porting everything into Tailwind.
- Buttons, cards, and badges consistently use rounded radii, subtle noise gradients, and layered shadows to create a premium, tactile feel.

## Responsiveness & Interaction Notes
- Tailwind breakpoints (`md`, `lg`, `xl`, `2xl`) drive layout shifts. Hero text adjusts from 56px to 104px across breakpoints, sections swap from stacked to side-by-side around `md`.
- Videos and hero overlays rely on `object-cover` and `mask-image` for text-through-video animations. `fix-safari-autoplay` class is used in conjunction with a visibilitychange script to handle Safari autoplay quirks.
- Buttons include visually hidden spans for screen readers, e.g., sr-only labels on the logo link.
- Keyboard accessibility is partially covered: slider responds to arrow keys, but some buttons (carousel controls) lack focus styles and rely on `<button>` semantics.

## Supabase & State Management
- `context/SupabaseProvider.tsx` instantiates Supabase, watches auth state, and exposes `useSupabase()` for client components. Login/signup pages rely on this provider for session checks and redirects.
- Secondary Supabase client (`supabaseDb1`) supports desktop sync scenarios, ensuring account data exists in both databases during signup.

## Implementation Considerations
- Many assets and sections are static; no server data fetching occurs yet. API routes (e.g., `/api/updates/download`) sit alongside the marketing site to supply desktop app functionality.
- When extending the design, follow existing patterns: reuse gradient backgrounds, maintain the chat-themed CTA, and keep interactivity light but illustrative rather than fully functional.
- **Desktop App Alignment**: See `../original-proper/DESIGN_OVERVIEW.md` for the current Electron app styling. Translating the marketing look into the app will require migrating fonts (EB Garamond/Geist), gradient assets, and CTA treatments into the Tailwind/shadcn component system used there.
