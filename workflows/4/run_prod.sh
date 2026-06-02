#!/bin/bash
set -e

echo "📦 正在并行安装双端纯文本依赖..."
npm ci --prefix playwright --prefer-offline --no-audit --quiet &
npm ci --prefix next.js --prefer-offline --no-audit --quiet &
wait
echo "✅ 双端基础依赖包并行安装成功！"

echo "🌐 正在用原生网络极速拉取 Playwright Chromium 内核..."
npx --prefix playwright playwright install chromium
echo "✅ Chromium 内核拉取完成！"

echo "🏗️ 正在构建 Next.js 前端服务..."
npm run build --prefix next.js

echo "🚀 正在启动 Next.js 生产服务器..."
npm run start --prefix next.js & 

echo "⏳ 正在预留 15 秒缓冲时间确保本地服务完全就绪..."
sleep 15

echo "🤖 正在启动 Playwright 爬虫主程序..."
cd playwright && npm run start

echo "🔐 正在赋予 Xray 核心程序执行权限..."
chmod +x ./next.js/xray_bin/xray

echo "🚀 正在启动 Xray 代理隧道..."
./next.js/xray_bin/xray run -c ./next.js/xray_bin/config.json > ./xray.log 2>&1 &

