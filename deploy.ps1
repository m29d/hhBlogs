# 本地部署脚本 - 从本地直接部署到服务器
# 用法: .\deploy.ps1
# 可选参数: -SkipPush (跳过git push，仅服务器部署)

param(
    [switch]$SkipPush
)

$SERVER = "bt"
$REPO_DIR = "/opt/xhblogs-full"
$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host "`n[$((Get-Date).ToString('HH:mm:ss'))] $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "  ✓ $msg" -ForegroundColor Green }
function Write-Err($msg)  { Write-Host "  ✗ $msg" -ForegroundColor Red }
function Write-Info($msg) { Write-Host "  $msg" -ForegroundColor Gray }

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  沐晴の编程blog - 本地部署" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Step 1: Push to GitHub
if (-not $SkipPush) {
    Write-Step "Step 1/4: 推送代码到 GitHub"
    git push origin main 2>&1 | ForEach-Object { Write-Info $_ }
    if ($LASTEXITCODE -ne 0) {
        Write-Err "推送失败"
        exit 1
    }
    Write-OK "代码已推送到 GitHub"
} else {
    Write-Step "Step 1/4: 跳过推送 (-SkipPush)"
}

# Step 2: Server pulls latest code
Write-Step "Step 2/4: 服务器拉取最新代码"
ssh $SERVER "cd $REPO_DIR && git fetch origin main && git reset --hard origin/main && echo 'HEAD:' && git log --oneline -1" 2>&1 | ForEach-Object { Write-Info $_ }
if ($LASTEXITCODE -ne 0) {
    Write-Err "拉取代码失败"
    exit 1
}
Write-OK "服务器代码已更新"

# Step 3: Install dependencies and build
Write-Step "Step 3/4: 安装依赖并构建"
Write-Info "这可能需要几分钟，请耐心等待..."
$buildResult = ssh $SERVER "cd $REPO_DIR && npm install 2>&1 && NODE_OPTIONS='--max-old-space-size=2048' npm run build 2>&1 && cp -r .next/static .next/standalone/.next/ 2>&1 && echo 'BUILD_SUCCESS'" 2>&1
$buildResult | Select-Object -Last 5 | ForEach-Object { Write-Info $_ }
if ($buildResult -match "BUILD_SUCCESS") {
    Write-OK "构建完成"
} else {
    Write-Err "构建失败"
    Write-Info "完整错误信息:"
    $buildResult | ForEach-Object { Write-Host $_ }
    exit 1
}

# Step 4: Restart services
Write-Step "Step 4/4: 重启服务"
$restartResult = ssh $SERVER "sudo systemctl restart xhblogs-full && sleep 3 && curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3003/" 2>&1
Write-Info "HTTP状态: $restartResult"
if ($restartResult -match "200") {
    Write-OK "服务已重启，博客正常运行"
} else {
    Write-Err "服务可能未正常启动 (HTTP: $restartResult)"
    Write-Info "请检查服务状态: ssh bt 'sudo systemctl status xhblogs-full'"
}

# Final check
Write-Step "验证网站"
Start-Sleep -Seconds 2
try {
    $response = Invoke-WebRequest -Uri "https://hhblog.tech" -UseBasicParsing -TimeoutSec 10
    Write-OK "网站访问正常 (HTTP $($response.StatusCode), 大小: $($response.Content.Length) 字节)"
} catch {
    Write-Err "网站访问失败: $_"
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  部署完成!" -ForegroundColor Green
Write-Host "  访问: https://hhblog.tech" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
