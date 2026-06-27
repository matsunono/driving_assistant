#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -f "$HOME/.sdkman/bin/sdkman-init.sh" ]]; then
  # Load SDKMAN and apply project Java version from .sdkmanrc.
  source "$HOME/.sdkman/bin/sdkman-init.sh"
  cd "$PROJECT_DIR"
  if [[ -f .sdkmanrc ]]; then
    sdk env >/dev/null
  fi
else
  cd "$PROJECT_DIR"
fi

if [[ -z "${CAPACITOR_ANDROID_STUDIO_PATH:-}" ]]; then
  CANDIDATES=(
    "$HOME/android-studio/bin/studio.sh"
    "/opt/android-studio/bin/studio.sh"
    "$HOME/.local/android-studio/bin/studio.sh"
  )

  for p in "${CANDIDATES[@]}"; do
    if [[ -x "$p" ]]; then
      export CAPACITOR_ANDROID_STUDIO_PATH="$p"
      break
    fi
  done
fi

if [[ -z "${CAPACITOR_ANDROID_STUDIO_PATH:-}" ]]; then
  echo "Android Studio not found. Set CAPACITOR_ANDROID_STUDIO_PATH in ~/.bashrc and retry."
  echo "Example: export CAPACITOR_ANDROID_STUDIO_PATH=\"$HOME/android-studio/bin/studio.sh\""
  exit 1
fi

exec npx cap open android
