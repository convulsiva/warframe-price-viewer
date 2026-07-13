#!/usr/bin/env bash
set -euo pipefail

APP_PATH="src-tauri/target/release/bundle/macos/Warframe Price Viewer.app"
DMG_DIR="src-tauri/target/release/bundle/dmg"
VERSION="$(node -p "require('./package.json').version")"
DMG_PATH="${DMG_DIR}/Warframe Price Viewer_${VERSION}_aarch64.dmg"

if [[ ! -d "${APP_PATH}" ]]; then
  echo "Missing app bundle: ${APP_PATH}" >&2
  exit 1
fi

find "${APP_PATH}" -exec xattr -c {} + 2>/dev/null || true
codesign --force --deep --sign - "${APP_PATH}"
codesign --verify --deep --strict --verbose=2 "${APP_PATH}"

mkdir -p "${DMG_DIR}"
rm -f "${DMG_PATH}"
hdiutil create -volname "Warframe Price Viewer" -srcfolder "${APP_PATH}" -ov -format UDZO "${DMG_PATH}"
hdiutil verify "${DMG_PATH}"

echo "Created ${DMG_PATH}"
