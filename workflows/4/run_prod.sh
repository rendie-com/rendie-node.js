# === 1. 启动 Xray 隧道（只跑服务，不给终端加任何代理变量） ===
chmod +x ./next.js/xray_bin/xray
./next.js/xray_bin/xray run -c ./next.js/xray_bin/config.json > ./xray.log 2>&1 &
sleep 4

# === 2. 【彻底根除】强行抹除 package.json 中的 postinstall 钩子 ===
if [ -f "playwright/package.json" ]; then
  sed -i 's/"postinstall":.*/"postinstall": "echo skip_postinstall",/' playwright/package.json
fi

# === 3. 注入全局变量，死死封锁所有可能触发下载的口子 ===
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

echo "📦 正在并行安装依赖 (已完全封锁浏览器下载链)..."
npm ci --prefix playwright --prefer-offline --no-audit --quiet &
npm ci --prefix next.js --prefer-offline --no-audit --quiet &
wait

# === 4. 彻底删掉原来的 npx playwright install chromium 这一行！===
# 直接开始构建 Next.js
echo "🏗️ 正在构建 Next.js 前端服务..."
npm run build --prefix next.js
npm run start --prefix next.js & 
sleep 15

echo "🤖 正在启动 Playwright..."
cd playwright && npm run start