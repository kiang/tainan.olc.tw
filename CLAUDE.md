# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tainan Open Data Maps is a collection of map-based visualizations for public issues in Taiwan, particularly focusing on Tainan City. The project was created by Finjon Kiang during his Tainan City Councilor election campaign and has evolved into numerous public interest projects covering healthcare, transportation, environmental monitoring, political activities, and civic data.

## Architecture

### Frontend Structure
- **docs/**: Main website content deployed via GitHub Pages
  - **docs/index.html**: Main political campaign site with district maps and candidate information
  - **docs/p/**: Project overview portal and individual project pages
  - **docs/p/index.html**: Central hub listing all 40+ public data projects
  - **docs/assets/**: Compiled assets for the main campaign site
  - **docs/json/**: Data files including YouTube video metadata, district boundaries, and routing information

### Individual Projects
Each project in `docs/p/` follows a consistent structure:
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

## Project Categories

The 40+ projects are organized into categories:
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

### Adding New Projects
1. Create new directory under `docs/p/[project-name]/`
2. Follow existing project structure with index.html and main.js
3. Add project entry to `docs/p/index.html` with appropriate category
4. Include og_image.png for social sharing

### Data Processing
1. Place raw data in appropriate `raw/` subdirectory
2. Use existing PHP scripts in `scripts/` or create new ones following established patterns
3. Output processed data to project-specific locations

### Map Integration
Most projects use OpenLayers (ol.js) for interactive mapping:
- **docs/css/ol.css**: Base OpenLayers styling
- **docs/js/ol.js**: OpenLayers library
- **docs/js/ol5-sidebar.min.js**: Sidebar components for map interfaces

## GitHub Pages Deployment

The site is deployed via GitHub Pages from the `docs/` directory. The main campaign site assets are pre-compiled and committed to the repository.