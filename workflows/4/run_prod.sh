#!/bin/bash
set -e

echo "🔧 正在同步更新容器系统根证书..."
if command -v apt-get >/dev/null 2>&1; then
  apt-get update -y && apt-get install -y ca-certificates >/dev/null 2>&1
fi

echo "🔐 正在赋予 Xray 核心程序执行权限..."
chmod +x ./next.js/xray_bin/xray

echo "🚀 正在启动 Xray 代理隧道..."
./next.js/xray_bin/xray run -c ./next.js/xray_bin/config.json > ./xray.log 2>&1 &
sleep 4

echo "🔍 正在验证代理节点连通性..."
if ! curl -s --socks5-hostname 127.0.0.1:10808 https://ip.sb --max-time 8 > /dev/null; then
  echo "🚨 [致命错误] Xray 隧道建立失败！"
  echo "------------------ 📋 以下为 Xray 核心崩溃日志 ------------------"
  cat ./xray.log
  echo "---------------------------------------------------------------"
  exit 1
fi

CURRENT_IP=$(curl -s --socks5-hostname 127.0.0.1:10808 https://ip.sb || echo "未知")
echo "✅ 节点本地 SOCKS5 转换成功！当前代理出口 IP: ${CURRENT_IP}"

# === 核心修复 1：跳过 postinstall 期间的浏览器下载，彻底打破死锁 ===
echo "📦 正在并行安装双端纯文本依赖 (隔离硬核文件锁)..."
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

npm ci --prefix playwright --prefer-offline --no-audit --quiet &
npm ci --prefix next.js --prefer-offline --no-audit --quiet &
wait
echo "✅ 双端基础依赖包并行安装完成。"

# === 核心修复 2：在外部单线程安全、干净地安装 Chromium ===
echo "🌐 正在单线程安全下载 Chromium 内核 (彻底绝杀卡死)..."
unset PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD
npx --prefix playwright playwright install chromium

# 构建核心前端后台并注入启动
echo "🏗️ 正在构建 Next.js 前端服务..."
npm run build --prefix next.js

echo "🚀 正在启动 Next.js 生产服务器..."
npm run start --prefix next.js & 

# 预留标准缓冲时间确保服务完全就绪
echo "⏳ 正在预留 15 秒缓冲时间确保本地服务完全就绪..."
sleep 15

echo "🤖 正在启动 Playwright 爬虫主程序..."
cd playwright && npm run start