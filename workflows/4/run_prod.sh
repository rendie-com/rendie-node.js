#!/bin/bash
set -e

# === 【核心修复】在启动 Xray 前，强行同步安装 Linux 系统的根证书 ===
echo "🔧 正在同步更新容器系统根证书 (防止 TLS 握手失败)..."
if command -v apt-get >/dev/null 2>&1; then
  apt-get update -y && apt-get install -y ca-certificates >/dev/null 2>&1
elif command -v apk >/dev/null 2>&1; then
  apk add --no-cache ca-certificates >/dev/null 2>&1
fi

# 3. 后台启动 Xray 隧道
echo "🚀 正在启动 Xray 代理隧道..."
./next.js/xray_bin/xray run -c ./next.js/xray_bin/config.json > /dev/null 2>&1 &
sleep 3

# 🔍 正在验证代理节点连通性...
echo "🔍 正在验证代理节点连通性..."

# 如果你还是担心节点被跳证书检查（调试用，可以给 curl 加上 -k），这里我们正常请求
if ! curl -s --socks5-hostname 127.0.0.1:10808 https://ip.sb --max-time 6 > /dev/null; then
  echo "🚨 [致命错误] Xray 隧道建立失败或 Vless 节点已失效！"
  echo "💡 提示：如果证书已经安装，请确认本地 188.164.248.3 节点的 2087 端口在公网是否对该 CI 环境开放。"
  exit 1
fi

CURRENT_IP=$(curl -s --socks5-hostname 127.0.0.1:10808 https://ip.sb || echo "未知")
echo "✅ 节点本地 SOCKS5 转换成功！当前代理出口 IP: ${CURRENT_IP}"

# 并行冷启动依赖安装，最大化压榨集群性能
echo "📦 正在并行安装项目依赖..."
npm ci --prefix playwright --prefer-offline --no-audit --quiet &
npm ci --prefix next.js --prefer-offline --no-audit --quiet &
wait

# 构建核心前端后台并注入启动
echo "🏗️ 正在构建 Next.js 前端服务..."
npm run build --prefix next.js
npm run start --prefix next.js & 

# 预留缓冲时间确保服务完全就绪
sleep 10

echo "🤖 正在启动 Playwright 爬虫主程序..."
cd playwright && npm run start