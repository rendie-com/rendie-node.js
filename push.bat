@echo off
:: 1. 确保第一行是这个，且文件保存为 UTF-8 编码
chcp 65001 >nul

echo 🚀 --- 准备推送 ---

:: 检查进程并清理
taskkill /F /IM chrome.exe /T >nul 2>&1

git add .

:: 2. 这里的引号和空格要完整
set datetime=%date% %time%
git commit -m "Auto sync: %datetime%"

:: 3. 检查这一行，必须有 echo 关键字
echo 📤 正在同步至 GitHub...
git push

echo.
echo ✅ 全部完成！
timeout /t 3 >nul