#!/bin/bash
set -e





echo "📦 正在并行安装双端纯文本依赖..."
npm ci --prefix playwright --prefer-offline --no-audit --quiet &
npm ci --prefix next.js --prefer-offline --no-audit --quiet &
wait
echo "--------------------------------------------------------"
echo "✅ [SUCCESS] 双端基础依赖包全部安装成功！"
echo "--------------------------------------------------------"

# 💡 强行让 Next.js 构建过程完全透明，不隐藏任何细节
echo "🏗️  [PROCESS] 正在启动 Next.js 生产环境打包 (CPU 密集打包中，请稍候)..."
npm run build --prefix next.js
echo "--------------------------------------------------------"
echo "✅ [SUCCESS] Next.js 核心前端编译打包完成！"
echo "--------------------------------------------------------"

echo "🚀 [PROCESS] 正在将 Next.js 生产服务器挂载至后台..."
npm run start --prefix next.js & 

echo "⏳ [PROCESS] 正在预留 15 秒缓冲时间，确保本地 3000 端口完全就绪..."
sleep 15
echo "🔥 [SUCCESS] 本地服务就绪！"


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

echo "🤖 [PROCESS] 正在拉起 Playwright 爬虫主程序开始采集 1688..."
cd playwright && npm run start