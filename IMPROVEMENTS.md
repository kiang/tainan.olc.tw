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

### 1.1 Performance Optimization
- [ ] Lazy-load images in portfolio section
- [ ] Compress and optimize image assets
- [ ] Add loading states for async components
- [ ] Preconnect to external resources (CDN, YouTube)

### 1.2 SEO & Social Sharing
- [ ] Add unique meta descriptions for each route
- [ ] Improve Open Graph tags per page
- [ ] Add structured data (JSON-LD) for person/politician schema
- [ ] Create sitemap.xml

### 1.3 Accessibility
- [ ] Add proper ARIA labels
- [ ] Ensure keyboard navigation works
- [ ] Check color contrast ratios
- [ ] Add alt text to all images

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

### 2.2 Simplified Navigation
- [ ] Reduce cognitive load on homepage
- [ ] Create clear call-to-action paths
- [ ] Add breadcrumb navigation
- [ ] Improve mobile navigation UX

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

### 4.1 Progressive Web App (PWA)
- [ ] Add service worker for offline support
- [ ] Create app manifest for installation
- [ ] Add push notification capability for campaign updates

### 4.2 Modern Web Features
- [ ] Dark mode support
- [ ] Reduced motion preferences
- [ ] Print-friendly styles for policy pages

### 4.3 Developer-Friendly
- [ ] Open source the campaign site code
- [ ] Add contributing guidelines
- [ ] Document the tech stack
- [ ] This reinforces open data/transparency values

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
