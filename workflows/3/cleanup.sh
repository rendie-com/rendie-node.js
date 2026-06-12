#!/bin/bash
set -e

# ====================================================================
# 0. 环境自适应：检测并补充 gh 客户端，同时解决容器内 Git 权限安全报错
# ====================================================================
if ! command -v gh &> /dev/null; then
  echo "ℹ️ 当前运行环境处于 Playwright 容器内，缺少 gh 客户端，正在自动补全官方二进制环境..."
  
  # 使用固定的官方稳定版，避免请求 GitHub API 动态获取版本导致 Action 速度变慢或触发限流
  GH_VER="2.65.0"
  curl -sSL "https://github.com/cli/cli/releases/download/v${GH_VER}/gh_${GH_VER}_linux_amd64.tar.gz" | tar -xz -C /usr/local --strip-components=1
  
  echo "✅ gh 客户端补全成功！"
fi

# 核心修复：解决容器用户与挂载目录所有者不一致导致的 dubious ownership 报错
if command -v git &> /dev/null; then
  git config --global --add safe.directory '*'
fi

echo "🧹 [开始执行自动化收尾与缓存清理]..."

# ====================================================================
# 1. 精准清理旧缓存：每种数据库只保留最新的一份，其余全部强制抹除
# ====================================================================

# 清理 shopee-marketing- 的旧缓存
OLD_MARKETING_CACHES=$(gh cache list --limit 100 --json id,key --jq '[.[] | select(.key | startswith("shopee-marketing-"))] | .[1:] | .[].id' 2>/dev/null || true)
if [ -n "$OLD_MARKETING_CACHES" ]; then
  echo "🗑️ 发现过期的【营销中心】旧缓存，正在清理..."
  echo "$OLD_MARKETING_CACHES" | xargs -I {} gh cache delete {}
else
  echo "ℹ️ 【营销中心】无多余旧缓存，无需清理。"
fi

# 清理 shopee-product- 的旧缓存
OLD_PRODUCT_CACHES=$(gh cache list --limit 100 --json id,key --jq '[.[] | select(.key | startswith("shopee-product-"))] | .[1:] | .[].id' 2>/dev/null || true)
if [ -n "$OLD_PRODUCT_CACHES" ]; then
  echo "🗑️ 发现过期的【商品】旧缓存，正在清理..."
  echo "$OLD_PRODUCT_CACHES" | xargs -I {} gh cache delete {}
else
  echo "ℹ️ 【商品】无多余旧缓存，无需清理。"
fi

# ====================================================================
# 2. 清理历史运行记录：保持工作流面板干净整洁
# ====================================================================
RUNS_TO_DELETE=$(gh run list --status completed --limit 500 --json databaseId --jq '.[].databaseId' 2>/dev/null | tail -n +51 || true)
if [ -n "$RUNS_TO_DELETE" ]; then
  echo "🗑️ 正在清理 50 次以前的历史运行记录..."
  echo "$RUNS_TO_DELETE" | xargs -I {} gh run delete {}
  echo "✅ 历史运行记录清理完毕。"
else
  echo "ℹ️ 历史运行记录未达清理阈值。"
fi

echo "✨ [所有垃圾文件与旧缓存已全部腾空，环境保持纯净]！"