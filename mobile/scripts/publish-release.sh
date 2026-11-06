#!/usr/bin/env bash
# Publishes app files to a fixed GitHub release so the download links never
# change: https://github.com/<repo>/releases/download/<tag>/<file>.
# The first run creates the release; later runs move its tag to this commit,
# update the title and notes, and replace the files.
#
# Usage (in GitHub Actions, with GH_TOKEN set and contents: write):
#   mobile/scripts/publish-release.sh <tag> <title> <notes> <file>...
set -euo pipefail

tag="$1"
title="$2"
notes="$3"
shift 3

if gh release view "$tag" >/dev/null 2>&1; then
  gh api -X PATCH "repos/${GITHUB_REPOSITORY}/git/refs/tags/${tag}" -f sha="$GITHUB_SHA" -F force=true >/dev/null
  gh release edit "$tag" --title "$title" --notes "$notes" --latest=false
  gh release upload "$tag" "$@" --clobber
else
  gh release create "$tag" --target "$GITHUB_SHA" --latest=false --title "$title" --notes "$notes" "$@"
fi

for file in "$@"; do
  echo "https://github.com/${GITHUB_REPOSITORY}/releases/download/${tag}/$(basename "$file")"
done
