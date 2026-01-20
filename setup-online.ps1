# 在线部署配置脚本
Write-Host "=== 在线部署配置向导 ===" -ForegroundColor Green
Write-Host ""

# 检查 .env 文件是否存在
$envPath = "backend\.env"
if (Test-Path $envPath) {
    Write-Host "检测到 .env 文件已存在" -ForegroundColor Yellow
    $overwrite = Read-Host "是否覆盖现有配置？(y/n)"
    if ($overwrite -ne "y") {
        Write-Host "已取消配置" -ForegroundColor Yellow
        exit
    }
}

# 从 env.example 创建 .env
if (Test-Path "backend\env.example") {
    Copy-Item "backend\env.example" $envPath
    Write-Host "已创建 .env 文件" -ForegroundColor Green
} else {
    Write-Host "未找到 env.example 文件" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "=== 数据库配置 ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "请选择数据库服务：" -ForegroundColor Yellow
Write-Host "1. PlanetScale (国外，免费，无需管理)"
Write-Host "2. 阿里云 RDS MySQL (国内，推荐，按量付费)"
Write-Host "3. 腾讯云 MySQL (国内，按量付费)"
Write-Host "4. Railway (国外，免费额度 `$5/月)"
Write-Host "5. 其他 MySQL 服务（手动输入连接字符串）"
Write-Host ""
$choice = Read-Host "请输入选项 (1/2/3/4/5)"

$databaseUrl = ""

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "PlanetScale 配置步骤：" -ForegroundColor Cyan
        Write-Host "1. 访问 https://planetscale.com"
        Write-Host "2. 使用 GitHub 账号注册"
        Write-Host "3. 创建新数据库"
        Write-Host "4. 点击 'Connect' 获取连接字符串"
        Write-Host ""
        $databaseUrl = Read-Host "请输入数据库连接字符串 (格式: mysql://user:pass@host:port/dbname)"
    }
    "2" {
        Write-Host ""
        Write-Host "阿里云 RDS MySQL 配置步骤：" -ForegroundColor Cyan
        Write-Host "1. 访问 https://www.aliyun.com"
        Write-Host "2. 注册/登录账号"
        Write-Host "3. 控制台 -> 云数据库 RDS MySQL -> 创建实例"
        Write-Host "4. 配置外网访问（数据安全性 -> 白名单设置 -> 申请外网地址）"
        Write-Host "5. 创建数据库 competition_db"
        Write-Host "6. 获取外网地址、端口、用户名、密码"
        Write-Host ""
        Write-Host "详细说明请查看：国内数据库配置指南.md" -ForegroundColor Yellow
        Write-Host ""
        $databaseUrl = Read-Host "请输入数据库连接字符串 (格式: mysql://root:密码@外网地址:3306/competition_db)"
    }
    "3" {
        Write-Host ""
        Write-Host "腾讯云 MySQL 配置步骤：" -ForegroundColor Cyan
        Write-Host "1. 访问 https://cloud.tencent.com"
        Write-Host "2. 注册/登录账号"
        Write-Host "3. 控制台 -> 云数据库 -> MySQL -> 创建实例"
        Write-Host "4. 开启外网地址，配置安全组开放3306端口"
        Write-Host "5. 创建数据库 competition_db"
        Write-Host ""
        Write-Host "详细说明请查看：国内数据库配置指南.md" -ForegroundColor Yellow
        Write-Host ""
        $databaseUrl = Read-Host "请输入数据库连接字符串 (格式: mysql://root:密码@外网地址:3306/competition_db)"
    }
    "4" {
        Write-Host ""
        Write-Host "Railway 配置步骤：" -ForegroundColor Cyan
        Write-Host "1. 访问 https://railway.app"
        Write-Host "2. 使用 GitHub 账号注册"
        Write-Host "3. 创建新项目 -> 添加 MySQL 服务"
        Write-Host "4. 在服务详情页获取连接字符串"
        Write-Host ""
        $databaseUrl = Read-Host "请输入数据库连接字符串"
    }
    "5" {
        Write-Host ""
        $databaseUrl = Read-Host "请输入 MySQL 连接字符串 (格式: mysql://user:pass@host:port/dbname)"
    }
    default {
        Write-Host "无效选项" -ForegroundColor Red
        exit
    }
}

# 生成 JWT Secret
$jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})

# 更新 .env 文件
$envContent = Get-Content $envPath -Raw
$envContent = $envContent -replace 'DATABASE_URL=".*"', "DATABASE_URL=`"$databaseUrl`""
$envContent = $envContent -replace 'JWT_SECRET=".*"', "JWT_SECRET=`"$jwtSecret`""
Set-Content -Path $envPath -Value $envContent

Write-Host ""
Write-Host "=== 配置完成 ===" -ForegroundColor Green
Write-Host ""
Write-Host "下一步操作：" -ForegroundColor Cyan
Write-Host "1. 确保数据库已创建并运行"
Write-Host "2. 运行数据库迁移："
Write-Host "   cd backend"
Write-Host "   npm run prisma:generate"
Write-Host "   npm run prisma:migrate"
Write-Host ""
Write-Host "3. 启动项目："
Write-Host "   后端: cd backend && npm run dev"
Write-Host "   前端: cd frontend && npm run dev"
Write-Host ""
