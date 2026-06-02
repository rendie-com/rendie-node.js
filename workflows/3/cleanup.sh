#!/bin/bash
set -e

echo "🧹 [开始执行自动化收尾与缓存清理]..."

# 1. 清理营销中心历史旧缓存
OLD_MARKETING_CACHES=$(gh cache list --limit 100 --json id,key --jq '[.[] | select(.key | startswith("shopee-marketing-"))] | .[1:] | .[].id' 2>/dev/null || true)
if [ -n "$OLD_MARKETING_CACHES" ]; then
  echo "🗑️ 发现过期的【营销中心】旧缓存，正在清理..."
  echo "$OLD_MARKETING_CACHES" | xargs -I {} gh cache delete {}
else
  echo "ℹ️ 【营销中心】无多余旧缓存，无需清理。"
fi

# 2. 清理商品历史旧缓存
OLD_PRODUCT_CACHES=$(gh cache list --limit 100 --json id,key --jq '[.[] | select(.key | startswith("shopee-product-"))] | .[1:] | .[].id' 2>/dev/null || true)
if [ -n "$OLD_PRODUCT_CACHES" ]; then
  echo "🗑️ 发现过期的【商品】旧缓存，正在清理..."
  echo "$OLD_PRODUCT_CACHES" | xargs -I {} gh cache delete {}
else
  echo "ℹ️ 【商品】无多余旧缓存，无需清理。"
fi

# 3. 清理历史运行记录
RUNS_TO_DELETE=$(gh run list --status completed --limit 500 --json databaseId --jq '.[].databaseId' | tail -n +51)
if [ -n "$RUNS_TO_DELETE" ]; then
  echo "🗑️ 正在清理 50 次以前的历史运行记录..."
  echo "$RUNS_TO_DELETE" | xargs -I {} gh run delete {}
  echo "✅ 历史运行记录清理完毕。"
else
  echo "ℹ️ 历史运行记录未达清理阈值。"
fi

echo "✨ [所有垃圾文件与旧缓存已全部腾空，环境保持纯净]！"