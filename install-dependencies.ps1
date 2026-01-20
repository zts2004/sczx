# 安装依赖脚本
Write-Host "开始安装依赖..." -ForegroundColor Green

# 安装后端依赖
Write-Host "`n正在安装后端依赖..." -ForegroundColor Yellow
Set-Location -Path "backend"
if (Test-Path "package.json") {
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "后端依赖安装成功！" -ForegroundColor Green
    } else {
        Write-Host "后端依赖安装失败！" -ForegroundColor Red
    }
} else {
    Write-Host "未找到 backend/package.json 文件" -ForegroundColor Red
}
Set-Location -Path ".."

# 安装前端依赖
Write-Host "`n正在安装前端依赖..." -ForegroundColor Yellow
Set-Location -Path "frontend"
if (Test-Path "package.json") {
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "前端依赖安装成功！" -ForegroundColor Green
    } else {
        Write-Host "前端依赖安装失败！" -ForegroundColor Red
    }
} else {
    Write-Host "未找到 frontend/package.json 文件" -ForegroundColor Red
}
Set-Location -Path ".."

Write-Host "`n依赖安装完成！" -ForegroundColor Green
