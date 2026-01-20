@echo off
chcp 65001 >nul
echo 开始安装依赖...
echo.

echo 正在安装后端依赖...
cd backend
if exist package.json (
    call npm install
    if %errorlevel% equ 0 (
        echo 后端依赖安装成功！
    ) else (
        echo 后端依赖安装失败！
    )
) else (
    echo 未找到 backend/package.json 文件
)
cd ..

echo.
echo 正在安装前端依赖...
cd frontend
if exist package.json (
    call npm install
    if %errorlevel% equ 0 (
        echo 前端依赖安装成功！
    ) else (
        echo 前端依赖安装失败！
    )
) else (
    echo 未找到 frontend/package.json 文件
)
cd ..

echo.
echo 依赖安装完成！
pause
