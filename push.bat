chcp 65001 >nul
git add .
git commit -m "Auto sync:%date% %time%"
git push origin main
timeout /t 50