#!/bin/bash
set -e

# === 1. 删掉了 sed 清理代码，直接串行安装（绝不卡死，代码干净） ===
echo "📦 正在安装 Playwright 端依赖..."
npm ci --prefix playwright --prefer-offline --no-audit --quiet

echo "📦 正在安装 Next.js 端依赖..."
npm ci --prefix next.js --prefer-offline --no-audit --quiet

echo "--------------------------------------------------------"
echo "✅ [SUCCESS] 双端基础依赖包全部安装成功！"
echo "--------------------------------------------------------"

# === 2. 前端服务构建与挂载 ===
echo "🏗️  [PROCESS] 正在启动 Next.js 生产环境打包..."
npm run build --prefix next.js

echo "🚀 [PROCESS] 正在将 Next.js 生产服务器挂载至后台..."
npm run start --prefix next.js & 

echo "⏳ [PROCESS] 正在预留 15 秒缓冲时间..."
sleep 15

# === 3. 启动 Xray 安全代理隧道 ===
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
  cat ./xray.log
  exit 1
fi

CURRENT_IP=$(curl -s --socks5-hostname 127.0.0.1:10808 https://ip.sb || echo "未知")
echo "✅ 节点本地 SOCKS5 转换成功！当前代理出口 IP: ${CURRENT_IP}"

# === 4. 拉起爬虫 ===
echo "🤖 [PROCESS] 正在拉起 Playwright 爬虫主程序..."
cd playwright && npm run start