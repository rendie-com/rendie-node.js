#!/bin/bash
set -e

# 0. 容器级环境健壮性防御
if ! command -v gh &> /dev/null; then
  echo "ℹ️ 检测到 Playwright 独立沙盒环境，缺少主机 gh 引擎，开始静默灌注官方最新二进制..."
  GH_VER="2.65.0"
  curl -sSL "https://github.com/cli/cli/releases/download/v${GH_VER}/gh_${GH_VER}_linux_amd64.tar.gz" | tar -xz -C /usr/local --strip-components=1
  echo "✅ 运行环境注入成功！"
fi

echo "🧹 [开始执行自动化收尾与空间回容]..."

# 1. 动态剥离过期的【采集箱】缓存层，只留最新的单帧基准
OLD_CRAWLER_CACHES=$(gh cache list --limit 100 --json id,key --jq '[.[] | select(.key | startswith("shopee-crawler-"))] | .[1:] | .[].id' 2>/dev/null || true)
if [ -n "$OLD_CRAWLER_CACHES" ]; then
  echo "🗑️ 发现历史【采集箱】残留缓存，正在擦除..."
  echo "$OLD_CRAWLER_CACHES" | xargs -I {} gh cache delete {}
else
  echo "ℹ️ 【采集箱】历史空间完美纯净。"
fi

# 2. 动态剥离过期的【聊聊】缓存层
OLD_CHAT_CACHES=$(gh cache list --limit 100 --json id,key --jq '[.[] | select(.key | startswith("shopee-chat-"))] | .[1:] | .[].id' 2>/dev/null || true)
if [ -n "$OLD_CHAT_CACHES" ]; then
  echo "🗑️ 发现历史【聊聊】残留缓存，正在擦除..."
  echo "$OLD_CHAT_CACHES" | xargs -I {} gh cache delete {}
else
  echo "ℹ️ 【聊聊】历史空间完美纯净。"
fi

# 3. 回收 50 次以前的历史流水日志堆积
RUNS_TO_DELETE=$(gh run list --status completed --limit 500 --json databaseId --jq '.[].databaseId' | tail -n +51)
if [ -n "$RUNS_TO_DELETE" ]; then
  echo "🗑️ 清理 50 组以前的沉余执行日志记录..."
  echo "$RUNS_TO_DELETE" | xargs -I {} gh run delete {}
  echo "✅ 执行树回收完毕。"
else
  echo "ℹ️ 历史运行树深度属于安全阈值内。"
fi

echo "✨ [所有垃圾文件与旧缓存已全部腾空，生产环境已重置为最纯净状态]！"