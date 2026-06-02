#!/bin/bash
set -e

# 3. 后台启动 Xray 隧道
echo "🚀 正在启动 Xray 代理隧道..."
./next.js/xray_bin/xray run -c ./next.js/xray_bin/config.json > /dev/null 2>&1 &
sleep 3

# === 【核心修复】严格测试 SOCKS5 代理是否真的通畅 ===
echo "🔍 正在验证代理节点连通性..."
# 使用 curl 强行挂载本地 socks5 代理访问 ip.sb 或 ipinfo.io，看是否能正确返回你节点的公网 IP
if ! curl -s --socks5-hostname 127.0.0.1:10808 https://ip.sb --max-time 5 > /dev/null; then
  echo "🚨 [致命错误] Xray 隧道建立失败或 Vless 节点已失效！请检查节点配置。"
  exit 1 # 强行打断，让 GitHub Actions 在此 Step 立刻爆红停止
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