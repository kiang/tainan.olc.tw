#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
RAW_DIR="$PROJECT_DIR/raw"

mkdir -p "$RAW_DIR"
echo "Downloading abc.csv..."
curl -sf -o "$RAW_DIR/abc.csv" "https://ltcpap.mohw.gov.tw/publish/abc.csv"
if [ $? -ne 0 ]; then
  echo "Download failed"
  exit 1
fi
echo "Downloaded to $RAW_DIR/abc.csv"

echo "Converting to JSON..."
python3 "$SCRIPT_DIR/csv2json.py"
