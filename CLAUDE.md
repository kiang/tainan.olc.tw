# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tainan Open Data Maps is a collection of map-based visualizations for public issues in Taiwan, particularly focusing on Tainan City. The project was created by Finjon Kiang during his Tainan City Councilor election campaign and has evolved into numerous public interest projects covering healthcare, transportation, environmental monitoring, political activities, and civic data.

## Architecture

This is a **hybrid architecture** project: a modern Vue 3 SPA at the root for the campaign site, plus 70+ standalone project pages under `docs/p/`.

### Vue 3 Campaign Site (Root)
- **index.html**: Root entry point for Vite dev server
- **src/**: Vue 3 application source
  - **src/main.js**: App entry point
  - **src/App.vue**: Main component
  - **src/components/**: Reusable components (Breadcrumb, LeafletMap, LoadingSpinner, PetitionModal)
  - **src/views/**: Page components (Home, Politics, TainanNews, District/*, PastRecord/*)
  - **src/router/index.js**: Vue Router config with meta tags for SEO
  - **src/assets/**: SCSS styles, images, and JSON data files
- **vite.config.js**: Vite build config — outputs to `docs/` while preserving `docs/p/`
- **public/**: Static PWA files (manifest.json, sw.js, offline.html, icons/, sitemap.xml, robots.txt)

### Built Site (docs/)
- **docs/**: GitHub Pages deployment directory (Vite build output)
  - **docs/assets/**: Compiled JS/CSS assets from Vite build
  - **docs/json/**: Data files including YouTube video metadata, district boundaries, and routing information
  - **docs/p/**: 70+ standalone project pages (not part of Vue build)
  - **docs/p/index.html**: Central hub listing all projects, loads from `docs/p/projects.json`
  - **docs/p/projects.json**: Project metadata for dynamic rendering (70 entries)

### Individual Projects (docs/p/)
Each project in `docs/p/` is a standalone page (not part of the Vue SPA) following a consistent structure:
- **index.html**: Main project page with map visualization
- **js/main.js**: Project-specific JavaScript logic
- **og_image.png**: Social media preview image
- Additional assets as needed (CSS, JSON data, images)

### Data Processing Scripts
- **scripts/**: PHP-based data processing utilities
  - Uses Composer with `phayes/geophp` for geographic data processing
  - **scripts/kml/**: KML to GeoJSON conversion tools
  - **scripts/youtube/**: YouTube data fetching and processing
  - **scripts/community/**: Community data extraction tools
  - **scripts/_config.php**: Configuration template for API keys

### Raw Data Storage
- **raw/**: Source data files in various formats
  - **raw/json/**: GeoJSON files from GPS tracking
  - **raw/kml/**: KML files for geographic data
  - **raw/car_json/** and **raw/car_kml/**: Vehicle tracking data

## Tech Stack

- **Framework**: Vue 3 with Composition API
- **Build Tool**: Vite
- **Styling**: SCSS with Bootstrap 5
- **Router**: Vue Router with hash history
- **Mapping**: Leaflet (modern), OpenLayers (legacy in some `docs/p/` projects)
- **Charts**: Chart.js
- **PWA**: Custom service worker with cache-first strategy
- **Deployment**: GitHub Pages from `docs/`

## Project Categories

The 70+ projects are organized into 11 categories:
- **政治** (Politics): Election data, candidate information, recall campaigns
- **交通** (Transportation): Traffic accidents, bike routes, YouBike stations
- **健康** (Health): Emergency rooms, dengue fever tracking, medical facilities
- **教育** (Education): Schools, preschools, childcare facilities
- **環境** (Environment): Land use changes, air quality, environmental monitoring
- **災害** (Disaster): Earthquake data, typhoon tracking, shelter locations
- **金融** (Finance): ATM locations, government financial data
- **社區** (Community): Community services, local businesses
- **能源** (Energy): Solar power, renewable energy, power generation
- **建築** (Construction): Building data, floor area studies
- **勞動** (Labor): Labor law violations, worker protections

## Development Workflow

### Campaign Site (Vue SPA)
```bash
npm install        # Install dependencies
npm run dev        # Start Vite dev server
npm run build      # Build to docs/ directory
```

### Adding New Projects (docs/p/)
1. Create new directory under `docs/p/[project-name]/`
2. Follow existing project structure with index.html and main.js
3. Add project entry to `docs/p/projects.json` with appropriate category
4. Include og_image.png for social sharing

### Data Processing
1. Place raw data in appropriate `raw/` subdirectory
2. Use existing PHP scripts in `scripts/` or create new ones following established patterns
3. Output processed data to project-specific locations

### Map Integration
- **Modern (Vue SPA)**: Uses Leaflet via `src/components/LeafletMap.vue`
- **Legacy (docs/p/ projects)**: Many use OpenLayers (ol.js) with sidebar components

## GitHub Pages Deployment

The site is deployed via GitHub Pages from the `docs/` directory. Vite builds the Vue SPA into `docs/` while preserving the standalone project pages in `docs/p/`.