@echo off
chcp 65001 >nul

echo 🚀 --- 准备推送 ---

:: 1. 强行清理可能残留的浏览器进程（防止文件占用）
:: /F 强制 /IM 进程名 /T 包含子进程
taskkill /F /IM chrome.exe /T >nul 2>&1
taskkill /F /IM chromedriver.exe /T >nul 2>&1

:: 2. 添加改动，但排除掉正在运行的日志和临时文件
git add .

:: 3. 提交
set datetime=%date% %time%
git commit -m "Auto sync: %datetime%"

:: 4. 推送
echo 📤 正在同步至 GitHub...
git push

echo.
echo ✅ 推送成功！
