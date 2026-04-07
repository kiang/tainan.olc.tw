# Contributing to 江明宗競選網站

感謝您對本專案的興趣！本網站是開源專案，歡迎社群貢獻。

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/kiang/tainan.olc.tw.git
cd tainan.olc.tw

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
tainan.olc.tw/
├── docs/                    # Built site (GitHub Pages deployment)
│   ├── p/                   # 70+ standalone civic tech project pages
│   │   ├── projects.json    # Project metadata for dynamic listing
│   │   └── index.html       # Project hub with search and filters
│   ├── assets/              # Compiled assets (Vite output)
│   ├── json/                # Data files (YouTube, districts, routes)
│   └── index.html           # Built entry point
├── public/                  # Static files (copied to docs/)
│   ├── icons/               # PWA icons
│   ├── manifest.json        # PWA manifest
│   ├── sw.js                # Service worker
│   ├── offline.html         # Offline fallback page
│   ├── sitemap.xml          # SEO sitemap
│   └── robots.txt           # Search engine directives
├── src/
│   ├── assets/
│   │   ├── images/          # Source images
│   │   ├── JSON/            # Data files
│   │   └── scss/            # SCSS styles (utilities, dark mode)
│   ├── components/          # Vue components (Breadcrumb, LeafletMap, etc.)
│   ├── router/              # Vue Router config with SEO meta
│   └── views/               # Page components (Home, District, PastRecord)
├── scripts/                 # PHP data processing utilities
├── raw/                     # Source data files (KML, GeoJSON, GPS)
├── index.html               # Development entry point (Vite)
├── vite.config.js           # Vite configuration
└── IMPROVEMENTS.md          # Roadmap and progress
```

## Tech Stack

- **Framework**: Vue 3 with Composition API
- **Build Tool**: Vite
- **Styling**: SCSS with Bootstrap 5
- **Router**: Vue Router with hash history
- **Mapping**: Leaflet (modern), OpenLayers (legacy projects in docs/p/)
- **Charts**: Chart.js
- **PWA**: Custom service worker with cache-first strategy
- **Deployment**: GitHub Pages from docs/

## How to Contribute

### Reporting Bugs

1. Check if the issue already exists
2. Create a new issue with:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable

### Suggesting Features

1. Check the [IMPROVEMENTS.md](IMPROVEMENTS.md) for planned features
2. Open an issue to discuss the feature
3. Wait for approval before implementing

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Test locally: `npm run dev`
5. Build to verify: `npm run build`
6. Commit with descriptive message
7. Push and create a Pull Request

### Commit Message Format

We use conventional commits:

```
feat: add new feature
fix: fix a bug
docs: documentation changes
style: formatting, no code change
refactor: code restructuring
test: adding tests
chore: maintenance tasks
```

## Code Style

- Use Vue 3 Composition API (`<script setup>`)
- Follow existing SCSS patterns
- Keep components small and focused
- Add `loading="lazy"` to images
- Include ARIA labels for accessibility

## Accessibility Guidelines

- Use semantic HTML elements
- Include alt text for images
- Ensure keyboard navigation works
- Maintain color contrast ratios
- Support reduced motion preferences

## Questions?

If you have questions, feel free to open an issue or contact the project maintainer.

---

This project is maintained by [Finjon Kiang](https://github.com/kiang).
