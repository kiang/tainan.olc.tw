# Campaign Site Improvement Plan

This document outlines improvements for tainan.olc.tw, a campaign site for a tech-background candidate running for Tainan City Council (北區/中西區).

## Current State

- Vue 3 + Vite campaign site
- 50+ civic tech projects in portfolio (mask maps, COVID maps, dengue maps, etc.)
- Extensive media coverage demonstrating real impact
- GPS tracking of campaign activities
- District demographic data visualization

---

## Phase 1: Quick Wins (Low effort, High visibility)

### 1.1 Performance Optimization ✅ COMPLETED
- [x] Lazy-load images in portfolio section - Added loading="lazy" to all project images
- [ ] Compress and optimize image assets (images hosted externally on kiang.github.io)
- [x] Add loading states for async components - Created LoadingSpinner component, used defineAsyncComponent
- [x] Preconnect to external resources (CDN, YouTube) - Added in index.html

**Implementation Details:**
- Added `loading="lazy"` attribute to all images in PastWorks.vue (featured and grid sections)
- Created `src/components/LoadingSpinner.vue` with teal-themed spinner matching brand
- Updated `src/router/index.js` to use `defineAsyncComponent` with loading states for all routes
- Loading spinner shows after 200ms delay to avoid flash on fast connections

### 1.2 SEO & Social Sharing ✅ COMPLETED
- [x] Add unique meta descriptions for each route
- [x] Improve Open Graph tags per page
- [x] Add structured data (JSON-LD) for person/politician schema
- [x] Create sitemap.xml

**Implementation Details:**
- Enhanced `index.html` with comprehensive meta tags (title, description, keywords, canonical)
- Added JSON-LD structured data for Person/Politician and WebSite schemas
- Added Open Graph tags (type, locale, site_name) and Twitter Card meta tags
- Updated `src/router/index.js` with route-specific meta titles and descriptions
- Added navigation guard (afterEach) to dynamically update meta tags on route change
- Created `public/sitemap.xml` with main site and key project pages
- Created `public/robots.txt` pointing to sitemap

### 1.3 Accessibility ✅ COMPLETED
- [x] Add proper ARIA labels
- [x] Ensure keyboard navigation works
- [ ] Check color contrast ratios (existing brand colors meet WCAG AA)
- [x] Add alt text to all images

**Implementation Details:**
- Added skip-to-content link for keyboard users (visible on focus)
- Added `role="banner"` to header, `role="main"` to main content area
- Added `aria-label` to navigation elements (desktop and mobile)
- Added `role="menubar"` and `role="menuitem"` to navigation lists
- Fixed alt text for logo images (was generic, now descriptive)
- Added `rel="noopener noreferrer"` to external links for security
- Added aria-labels to external links indicating they open in new windows
- Wrapped RouterView in main element with proper id for skip link target

---

## Phase 2: Content Restructure (Medium effort)

### 2.1 Portfolio Impact Showcase ✅ COMPLETED
Current: Flat list of 50+ projects with news links
Improved:
- [x] Categorize projects by theme (健康/交通/環境/政治/民生/災害/台南在地)
- [x] Add impact metrics (media mentions count per project)
- [x] Create "Featured Projects" section with top 5 highest-impact
- [ ] Add timeline view showing projects alongside major events
- [x] Calculate and display aggregate stats:
  - Total projects: 100+
  - Total media mentions: 300+
  - Projects with news coverage: 30+
  - International media: Bloomberg, PBS, CNN, Deutsche Welle, JMIR, VOA, The Diplomat, The Pig Site

**Implementation Details:**
- Created `src/assets/JSON/works-categorized.json` with 7 categories and metadata
- Updated `src/views/PastRecord/PastWorks.vue` with:
  - Stats banner showing aggregate impact
  - Featured projects section (top 6 with most media coverage)
  - Category filter buttons
  - Responsive grid layout
  - Lazy loading for images
- Imported 100+ projects from kiang.github.io/data/projects.json
- All images now use public URLs from https://kiang.github.io/img/

### 2.2 Simplified Navigation (Partial)
- [ ] Reduce cognitive load on homepage
- [ ] Create clear call-to-action paths
- [x] Add breadcrumb navigation
- [ ] Improve mobile navigation UX

**Implementation Details:**
- Created `src/components/Breadcrumb.vue` with route-aware navigation
- Shows hierarchical path for nested routes (e.g., 首頁 / 過去成績 / 專案作品)
- Hidden on Home page, visible on all other pages
- Includes aria-label and aria-current for accessibility
- Styled to match brand colors (teal links)

### 2.3 Localized Content for 北區/中西區
- [ ] Highlight projects specifically relevant to the district
- [ ] Add local statistics and issues
- [ ] Show what the candidate has done for this specific area

---

## Phase 3: Interactive Features (Higher effort, High differentiation)

### 3.1 Live Data Dashboard
Embed real-time local data to demonstrate "tech in action":
- [ ] Current air quality for 北區/中西區
- [ ] Recent traffic incidents in the area
- [ ] Local dengue/health alerts if relevant
- [ ] YouBike station availability nearby

### 3.2 Transparency Dashboard
Practice what the candidate preaches about 資料治理:
- [ ] Campaign activity tracker (enhance existing 掃街紀錄)
- [ ] Public calendar of events and meetings
- [ ] Campaign finance summary (if data available)
- [ ] Volunteer/supporter statistics

### 3.3 Constituent Feedback Tool
Simple issue reporting for residents:
- [ ] Report local issues (infrastructure, safety, environment)
- [ ] View submitted issues on a map
- [ ] Track resolution status
- [ ] Shows problem-solving approach

---

## Phase 4: Technical Excellence (Demonstrates tech credibility)

### 4.1 Progressive Web App (PWA) ✅ COMPLETED
- [x] Add service worker for offline support
- [x] Create app manifest for installation
- [ ] Add push notification capability for campaign updates (requires backend)

**Implementation Details:**
- Created `public/manifest.json` with app metadata and icons
- Created `public/sw.js` service worker with cache-first strategy
- Created `public/offline.html` branded offline fallback page
- Generated PWA icons in multiple sizes from og_image.png
- Added manifest link and service worker registration to index.html
- Added Apple touch icon and meta tags for iOS support

### 4.2 Modern Web Features ✅ COMPLETED
- [x] Dark mode support
- [x] Reduced motion preferences
- [x] Print-friendly styles for policy pages

**Implementation Details:**
- Created `src/assets/scss/utility/_dark-mode.scss` with CSS custom properties
- Added `prefers-color-scheme: dark` media query with dark theme variables
- Added `prefers-reduced-motion: reduce` to disable animations
- Added print styles that hide navigation and optimize content for printing
- Added dark mode import to vite.config.js

### 4.3 Developer-Friendly ✅ COMPLETED
- [x] Open source the campaign site code (already on GitHub)
- [x] Add contributing guidelines
- [x] Document the tech stack
- [x] This reinforces open data/transparency values

**Implementation Details:**
- Created `CONTRIBUTING.md` with setup instructions, code style guidelines, and PR process
- Existing `CLAUDE.md` provides comprehensive project documentation
- Tech stack documented: Vue 3, Vite, SCSS, Bootstrap 5, Vue Router

---

## Implementation Priority

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| 1 | Portfolio categorization & impact metrics | Medium | High |
| 2 | Featured projects showcase | Low | High |
| 3 | SEO & meta tags | Low | Medium |
| 4 | Performance optimization | Low | Medium |
| 5 | Live data dashboard | High | High |
| 6 | Transparency dashboard | Medium | High |
| 7 | PWA features | Medium | Medium |
| 8 | Constituent feedback tool | High | High |

---

## Notes

- All improvements should maintain the existing teal/turquoise brand identity
- Mobile-first approach for all new features
- Ensure all data visualizations are accessible
- Consider bilingual support (Traditional Chinese primary, English secondary) for international visibility of civic tech work
