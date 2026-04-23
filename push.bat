
echo "🚀 --- 准备推送 ---"
git add .
set "dt=%date% %time%"
git commit -m "Auto sync: %dt%"
echo "📤 正在同步至 GitHub..."
git push origin main
echo "✅ 全部完成！"
timeout /t 3 >nul