#!/usr/bin/env bash
# process.sh — Extract a comic archive in a session directory.
# Usage: ./process.sh <session_id>
#
# The session directory is expected to be at:
#   <script_dir>/static/sessions/<session_id>/

set -euo pipefail

SESSION_ID="${1:?Usage: $0 <session_id>}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SESSION_DIR="${SCRIPT_DIR}/static/sessions/${SESSION_ID}"

echo "[process.sh] Extracting session ${SESSION_ID}" >> "${SCRIPT_DIR}/process.log"

# Extract all ZIP archives
find "${SESSION_DIR}" -maxdepth 1 -name "*.zip" | while read -r f; do
    unzip -o "$f" -d "${SESSION_DIR}" >> "${SCRIPT_DIR}/process.log" 2>&1 || true
done

# Extract all RAR archives
find "${SESSION_DIR}" -maxdepth 1 -name "*.rar" | while read -r f; do
    unrar x -o+ "$f" "${SESSION_DIR}/" >> "${SCRIPT_DIR}/process.log" 2>&1 || true
done

echo "[process.sh] Done" >> "${SCRIPT_DIR}/process.log"
