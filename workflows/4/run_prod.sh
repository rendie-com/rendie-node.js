#!/bin/bash
set -e
# 3. 后台启动 Xray 隧道
./next.js/xray_bin/xray run -c ./next.js/xray_bin/config.json > /dev/null 2>&1 &
sleep 3
echo "✅ 节点本地 SOCKS5 转换成功！"

# 并行冷启动依赖安装，最大化压榨集群性能
npm ci --prefix playwright --prefer-offline --no-audit --quiet &
npm ci --prefix next.js --prefer-offline --no-audit --quiet &
wait

# 构建核心前端后台并注入启动
npm run build --prefix next.js
npm run start --prefix next.js & 

# 预留缓冲时间确保服务完全就绪
sleep 10
cd playwright && npm run start