#!/bin/bash
set -e

# 1. 更新证书，确保 Vless 握手 TLS 不会失败
echo "🔧 正在同步更新容器系统根证书..."
if command -v apt-get >/dev/null 2>&1; then
  apt-get update -y && apt-get install -y ca-certificates >/dev/null 2>&1
fi

# 2. 保持在根目录，直接赋予 Xray 权限并启动
echo "🔐 正在赋予 Xray 核心程序执行权限..."
chmod +x ./next.js/xray_bin/xray

echo "🚀 正在启动 Xray 代理隧道..."
./next.js/xray_bin/xray run -c ./next.js/xray_bin/config.json > ./xray.log 2>&1 &
sleep 4

# 3. 验证本地 10808 隧道是否打通
echo "🔍 正在验证代理节点连通性..."
if ! curl -s --socks5-hostname 127.0.0.1:10808 https://ip.sb --max-time 8 > /dev/null; then
  echo "🚨 [致命错误] Xray 隧道建立失败！"
  cat ./xray.log
  exit 1
fi

CURRENT_IP=$(curl -s --socks5-hostname 127.0.0.1:10808 https://ip.sb || echo "未知")
echo "✅ 节点本地 SOCKS5 转换成功！当前代理出口 IP: ${CURRENT_IP}"


# 4. 【核心阻断】抹除 package.json 中的 postinstall，彻底用上容器自带的内核
echo "🧹 正在动态清理 playwright/package.json 中的并发死锁隐患..."
if [ -f "playwright/package.json" ]; then
  sed -i 's/"postinstall":.*/"postinstall": "echo skip_postinstall",/' playwright/package.json
fi

# 告诉全局环境跳过任何隐式下载
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1


# 5. 并行安装双端纯文本依赖 (由于干掉了 postinstall，这里绝不卡死，秒过)
echo "📦 正在并行安装双端纯文本依赖..."
npm ci --prefix playwright --prefer-offline --no-audit --quiet &
npm ci --prefix next.js --prefer-offline --no-audit --quiet &
wait
echo "✅ 双端基础依赖包并行安装成功！"


# 6. 构建并启动前端
echo "🏗️ 正在构建 Next.js 前端服务..."
npm run build --prefix next.js

echo "🚀 正在启动 Next.js 生产服务器..."
npm run start --prefix next.js & 
sleep 15


# 7. 运行主程序（Playwright 会根据 browser.mjs 的配置，精准让 1688 走 10808 代理）
echo "🤖 正在启动 Playwright 爬虫主程序..."
cd playwright && npm run start