#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET_DIR="$SCRIPT_DIR/../../../docs/p/2026/clean"

curl -s -o "$TARGET_DIR/council2026.json" "https://council2026.taiwangogo.tw/export/people.json"
curl -s -o "$TARGET_DIR/local2026.json" "https://local2026.taiwangogo.tw/export/records.json"
