#!/bin/bash
set -e

echo "🔧 正在同步更新容器系统根证书..."
if command -v apt-get >/dev/null 2>&1; then
  apt-get update -y && apt-get install -y ca-certificates >/dev/null 2>&1
fi

# 核心修改 1：动态生成 config.json，强行开启 allowInsecure: true 绕过所有证书限制
cat << 'EOF' > ./next.js/xray_bin/config.json
{
  "inbounds": [{
    "port": 10808,
    "protocol": "socks",
    "settings": { "auth": "noauth", "udp": true }
  }],
  "outbounds": [{
    "protocol": "vless",
    "settings": {
      "vnext": [{
        "address": "188.164.248.3",
        "port": 2087,
        "users": [{ "id": "899014a9-64db-480e-8fc7-287b79c8694d", "encryption": "none" }]
      }]
    },
    "streamSettings": {
      "network": "ws",
      "security": "tls",
      "tlsSettings": { 
        "serverName": "rendie.ccwu.cc", 
        "fingerprint": "chrome",
        "allowInsecure": true
      },
      "wsSettings": { "path": "/", "headers": { "Host": "rendie.ccwu.cc" } }
    }
  }]
}
EOF

# 核心修改 2：不再丢弃日志，把日志记录到 xray.log 中
echo "🚀 正在启动 Xray 代理隧道..."
./next.js/xray_bin/xray run -c ./next.js/xray_bin/config.json > ./xray.log 2>&1 &
sleep 4

echo "🔍 正在验证代理节点连通性..."
# 增加到 8 秒超时，给握手留足缓冲
if ! curl -s --socks5-hostname 127.0.0.1:10808 https://ip.sb --max-time 8 > /dev/null; then
  echo "🚨 [致命错误] Xray 隧道建立失败！"
  echo "------------------ 📋 以下为 Xray 核心崩溃日志 ------------------"
  cat ./xray.log # 🌟 把后台真正的报错原因直接倾倒在控制台上！
  echo "---------------------------------------------------------------"
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