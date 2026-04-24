chcp 65001 >nul

git add .
git commit -m "Auto sync:%date% %time%"
git push origin main
echo "推送成功！"
timeout /t 50