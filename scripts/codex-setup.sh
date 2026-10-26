#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "Installing Fambo JavaScript dependencies"
npm ci
echo "Preparing isolated Python Playwright environment"
python3 -m venv .venv
.venv/bin/python -m pip install --disable-pip-version-check playwright
.venv/bin/python -m playwright install --with-deps chromium
echo "Fambo environment ready. Start preview with: npm run dev"
