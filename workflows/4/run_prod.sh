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


echo "🧹 正在动态清理 playwright/package.json 中的并发死锁隐患..."
if [ -f "playwright/package.json" ]; then
  sed -i 's/"postinstall":.*/"postinstall": "echo skip_postinstall",/' playwright/package.json
fi


echo "📦 正在并行安装双端纯文本依赖..."
npm ci --prefix playwright --prefer-offline --no-audit --quiet &
npm ci --prefix next.js --prefer-offline --no-audit --quiet &
wait
echo "✅ 双端基础依赖包并行安装成功！"


# === 🛠️【核心修复】为内核下载强行注入代理，并开启全日志暴露 ===
echo "🌐 正在通过本地 SOCKS5 代理安全下载 Playwright Chromium 内核..."
# 显式注入代理，确保 playwright install 能够畅通无阻地连接
export HTTP_PROXY="http://127.0.0.1:10808"
export HTTPS_PROXY="http://127.0.0.1:10808"
export ALL_PROXY="socks5://127.0.0.1:10808"

# 💡 去掉所有可能的静音，让下载进度条和报错直接打印出来
npx --prefix playwright playwright install chromium
echo "✅ Chromium 内核下载并解压完成！"


# 关闭下载专用的全局终端代理（防止影响本地 localhost 通信）
unset HTTP_PROXY
unset HTTPS_PROXY
unset ALL_PROXY


echo "🏗️ 正在构建 Next.js 前端服务..."
npm run build --prefix next.js

echo "🚀 正在启动 Next.js 生产服务器..."
npm run start --prefix next.js & 

echo "⏳ 正在预留 15 秒缓冲时间确保本地服务完全就绪..."
sleep 15

echo "🤖 正在启动 Playwright 爬虫主程序..."
cd playwright && npm run start