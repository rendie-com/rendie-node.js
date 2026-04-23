@echo off
:: 设置字符编码为 UTF-8，防止中文乱码
chcp 65001 >nul

echo 🚀 开始自动推送流程...

:: 1. 检查是否有文件变动
git add .

:: 2. 自动生成提交信息（包含当前时间）
set datetime=%date% %time%
echo 📝 正在提交记录: %datetime%
git commit -m "Auto sync: %datetime%"

:: 3. 执行推送
echo 📤 正在推送到远程仓库...
git push

echo.
echo ✅ 全部完成！窗口将在 3 秒后关闭。
timeout /t 3 >nul