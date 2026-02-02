#!/usr/bin/env bash

# Build script for tainan.olc.tw
# This script builds the Vue campaign site and deploys to docs/

set -e

echo "Cleaning old campaign assets..."
# Remove old hashed JS/CSS files from docs/assets/ but keep images that might be referenced elsewhere
# Only remove files that match the campaign site patterns (index.*, component names like DistrictMap.*, etc.)
cd docs/assets
rm -f index.*.js index.*.css
rm -f DistrictMap.*.js DistrictMap.*.css
rm -f Politics.*.js Politics.*.css
rm -f PastRecord.*.js PastRecord.*.css
rm -f PastWorks.*.js PastWorks.*.css
rm -f SpeechRecord.*.js SpeechRecord.*.css
rm -f RelatedNews.*.js RelatedNews.*.css
rm -f RecordOfStreetMap.*.js RecordOfStreetMap.*.css
rm -f TainanThree.*.js TainanThree.*.css
rm -f white-arrow.*.js
cd ../..

echo "Building Vue application..."
npm run build

echo "Build complete! Generated files in docs/"
ls -la docs/index.html
echo ""
echo "New assets:"
ls docs/assets/*.js docs/assets/*.css 2>/dev/null | head -20
