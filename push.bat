@echo off
:: 强制切换到 UTF-8 编码
chcp 65001 >nul

echo.
echo "--------------------------------"
echo "🚀 [Start] 准备同步到 GitHub..."
echo "--------------------------------"

:: 1. 强力清理 git 锁文件（防止意外中断导致的推送失败）
del /f .git\index.lock >nul 2>&1

:: 2. 提交代码
git add .
set "dt=%date% %time%"
git commit -m "Auto sync: %dt%"

:: 3. 执行推送
echo "📤 [Pushing] 正在上传代码..."
git push origin main

echo.
echo "✅ [Done] 推送成功！"
echo "--------------------------------"

:: 5秒后自动关闭
timeout /t 5