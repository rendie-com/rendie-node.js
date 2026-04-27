@echo off
git add .
if errorlevel 1 (
    echo Git add failed
    pause
    exit /b 1
)

git commit -m "Auto sync:%date% %time%"
if errorlevel 1 (
    echo Nothing to commit or commit failed
    timeout /t 10
    exit /b 1
)

git push origin main
if errorlevel 1 (
    echo Git push failed
    pause
    exit /b 1
)

echo Sync completed successfully
timeout /t 5