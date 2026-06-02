#!/bin/bash
set -e

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