# Local deploy script - deploy from local machine to server
# Usage: .\deploy.ps1
# Optional: -SkipPush (skip git push, deploy only)

param(
    [switch]$SkipPush
)

$SERVER = "bt"
$REPO_DIR = "/opt/xhblogs-full"
$ErrorActionPreference = "Continue"

function Write-Step($msg) { Write-Host "`n[$((Get-Date).ToString('HH:mm:ss'))] $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "  OK $msg" -ForegroundColor Green }
function Write-Err($msg)  { Write-Host "  ERR $msg" -ForegroundColor Red }
function Write-Info($msg) { Write-Host "  $msg" -ForegroundColor Gray }

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Local Deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Step 1: Push to GitHub
if (-not $SkipPush) {
    Write-Step "Step 1/4: Push to GitHub"
    git push origin main 2>&1 | ForEach-Object { Write-Info $_ }
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Push failed"
        exit 1
    }
    Write-OK "Pushed to GitHub"
} else {
    Write-Step "Step 1/4: Skip push (-SkipPush)"
}

# Step 2: Server pulls latest code
Write-Step "Step 2/4: Pull code on server"
ssh $SERVER "cd $REPO_DIR ; git fetch origin main ; git reset --hard origin/main ; echo HEAD: ; git log --oneline -1" 2>&1 | ForEach-Object { Write-Info $_ }
if ($LASTEXITCODE -ne 0) {
    Write-Err "Pull failed"
    exit 1
}
Write-OK "Server code updated"

# Step 3: Install dependencies and build
Write-Step "Step 3/4: Install and build"
Write-Info "This may take a few minutes..."
$buildResult = ssh $SERVER "cd $REPO_DIR ; npm install 2>&1 ; NODE_OPTIONS='--max-old-space-size=2048' npm run build 2>&1 ; cp -r .next/static .next/standalone/.next/ 2>&1 ; echo 'BUILD_SUCCESS'" 2>&1
$buildResult | Select-Object -Last 5 | ForEach-Object { Write-Info $_ }
if ($buildResult -match "BUILD_SUCCESS") {
    Write-OK "Build completed"
} else {
    Write-Err "Build failed"
    Write-Info "Full output:"
    $buildResult | ForEach-Object { Write-Host $_ }
    exit 1
}

# Step 4: Restart services
Write-Step "Step 4/4: Restart service"
$restartResult = ssh $SERVER "sudo systemctl restart xhblogs-full ; sleep 3 ; curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3003/" 2>&1
Write-Info "HTTP status: $restartResult"
if ($restartResult -match "200") {
    Write-OK "Service restarted"
} else {
    Write-Err "Service may not be running (HTTP: $restartResult)"
    Write-Info "Check status: ssh bt 'sudo systemctl status xhblogs-full'"
}

# Final check
Write-Step "Verify website"
Start-Sleep -Seconds 2
try {
    $response = Invoke-WebRequest -Uri "https://hhblog.tech" -UseBasicParsing -TimeoutSec 10
    Write-OK "Website OK (HTTP $($response.StatusCode), length: $($response.Content.Length))"
} catch {
    Write-Err "Website check failed: $_"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deploy complete!" -ForegroundColor Green
Write-Host "  Visit: https://hhblog.tech" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
