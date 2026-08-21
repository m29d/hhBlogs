#!/bin/bash
set -e

cd /opt/xhblogs-full

echo '[rebuild] fetching latest code...'

# Try git fetch first (preferred, preserves git history)
FETCH_OK=0
for i in 1 2 3; do
  if git fetch origin main 2>&1; then
    FETCH_OK=1
    break
  fi
  echo "[rebuild] git fetch attempt $i failed, retrying in 5s..."
  sleep 5
done

if [ "$FETCH_OK" -eq 1 ]; then
  git reset --hard origin/main 2>&1
  echo '[rebuild] code updated via git'
else
  echo '[rebuild] git fetch failed, falling back to GitHub API tarball...'

  # Use GitHub API tarball as fallback (bypasses github.com connectivity issues)
  TMP_DIR=$(mktemp -d)
  TARBALL="$TMP_DIR/repo.tar.gz"

  curl -sL -o "$TARBALL" -w '%{http_code}' https://api.github.com/repos/m29d/hhBlogs/tarball/main > "$TMP_DIR/curl_status"
  CURL_STATUS=$(cat "$TMP_DIR/curl_status")

  if [ "$CURL_STATUS" != "200" ]; then
    echo "[rebuild] ERROR: GitHub API returned HTTP $CURL_STATUS"
    rm -rf "$TMP_DIR"
    exit 1
  fi

  echo "[rebuild] tarball downloaded, extracting..."
  mkdir -p "$TMP_DIR/extract"
  tar -xzf "$TARBALL" -C "$TMP_DIR/extract" --strip-components=1

  echo '[rebuild] syncing files...'
  # Sync source files but preserve build outputs and git metadata
  rsync -a --delete \
    --exclude='/.git' \
    --exclude='/node_modules' \
    --exclude='/.next' \
    "$TMP_DIR/extract/" /opt/xhblogs-full/

  # Update git index so git status remains consistent
  git add -A 2>/dev/null || true
  git commit -m 'rebuild: sync from GitHub tarball' 2>/dev/null || true

  rm -rf "$TMP_DIR"
  echo '[rebuild] code updated via GitHub API tarball'
fi

echo '[rebuild] building...'
npm run build 2>&1 | tail -5

echo '[rebuild] copying static files...'
cp -r .next/static .next/standalone/.next/

echo '[rebuild] restarting service...'
sudo systemctl restart xhblogs-full

echo '[rebuild] DONE'
