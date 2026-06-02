#!/bin/bash
set -e

# 并行安装依赖
npm ci --prefix playwright --prefer-offline --no-audit & 
npm ci --prefix next.js --prefer-offline --no-audit &
wait

# 构建并启动服务
npm run build --prefix next.js
npm run start --prefix next.js & 

sleep 10
cd playwright && npm run start