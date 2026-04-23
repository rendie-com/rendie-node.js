@echo off
:: 强制指定 UTF-8 编码
chcp 65001 >nul

:: 使用引号包裹 echo 的内容，防止 CMD 解析歧义
echo "🚀 --- 准备推送 ---"

:: 1. 检查是否有变动
git add .

:: 2. 提交（这里我们简化一下时间格式，避免特殊字符干扰）
set "dt=%date% %time%"
git commit -m "Auto sync: %dt%"

:: 3. 推送（这里是最容易报错的地方，加了引号保护）
echo "📤 正在同步至 GitHub..."
git push

echo "✅ 全部完成！"
timeout /t 3 >nul