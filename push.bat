@echo off
:: 切换到 UTF-8
chcp 65001 >nul

echo.
echo "🚀 --- Start Sync ---"

:: 强制清理可能冲突的 git 锁
del /f .git\index.lock >nul 2>&1

git add .

:: 使用引号包裹变量，防止时间中的空格导致 commit 失败
set "dt=%date% %time%"
git commit -m "Auto sync: %dt%"

echo.
echo "📤 Pushing to GitHub..."
:: 加上 origin main 确保路径明确
git push origin main

echo.
echo "✅ All Done!"
:: 缩短等待时间，或者按任意键退出
timeout /t 50