#!/bin/bash
set -e
cd /opt/xhblogs-full
echo '[rebuild] pulling latest code...'
git pull origin main 2>&1
echo '[rebuild] building...'
npm run build 2>&1 | tail -5
echo '[rebuild] copying static files...'
cp -r .next/static .next/standalone/.next/
echo '[rebuild] restarting service...'
sudo systemctl restart xhblogs-full
echo '[rebuild] DONE'
