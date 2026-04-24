@echo off
:: 强制切换到 UTF-8 编码
chcp 65001 >nul

git add .
git commit -m "Auto sync:%date% %time%"
git push origin main
echo "推送成功！"
timeout /t 50