#!/usr/bin/env bash
# Copies the newest résumé PDF into the site so /resume/Vishal_Nagamalla_Resume.pdf always serves the latest version.
# Runs automatically from the pre-commit hook (see .githooks/pre-commit); safe to run by hand too.
set -euo pipefail
SRC="${RESUME_SRC:-$HOME/Documents/Documents/Personal/Resume/Vishal_Nagamalla_Resume.pdf}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DST="$ROOT/resume/Vishal_Nagamalla_Resume.pdf"
if [ ! -f "$SRC" ]; then
  echo "sync-resume: source not found ($SRC), keeping the copy already in the repo" >&2
  exit 0
fi
mkdir -p "$(dirname "$DST")"
if cmp -s "$SRC" "$DST"; then
  echo "sync-resume: résumé already up to date"
else
  cp "$SRC" "$DST"
  echo "sync-resume: copied newest résumé into resume/"
  if git -C "$ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git -C "$ROOT" add "$DST"
  fi
fi
