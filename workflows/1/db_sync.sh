#!/bin/bash
set -e

# 检查 DB_01 (采集箱)
if [ -d "$DB_01" ] && [ "$(ls -A "$DB_01" 2>/dev/null)" ]; then
  echo "✅ [DB_01] 历史缓存加载成功。"
else
  echo "⚠️ [DB_01] 缓存未找到，开始下载外部备份接力..."
  git clone --depth 1 "https://x-access-token:${MY_PAT}@github.com/rendie-com/rendie-sqlite3-shopee-crawler.git" temp_db01
  mkdir -p "$DB_01"
  cp -af temp_db01/$DB_01/. "$DB_01/"
  rm -rf temp_db01
fi

# 检查 DB_02 (聊聊)
if [ -d "$DB_02" ] && [ "$(ls -A "$DB_02" 2>/dev/null)" ]; then
  echo "✅ [DB_02] 历史缓存加载成功。"
else
  echo "⚠️ [DB_02] 缓存未找到，开始下载外部备份接力..."
  git clone --depth 1 "https://x-access-token:${MY_PAT}@github.com/rendie-com/rendie-sqlite3-shopee-chat.git" temp_db02
  mkdir -p "$DB_02"
  cp -af temp_db02/$DB_02/. "$DB_02/"
  rm -rf temp_db02
fi

# 检查 DB_03 (商品)
if [ -d "$DB_03" ] && [ "$(ls -A "$DB_03" 2>/dev/null)" ]; then
  echo "✅ [DB_03] 历史缓存加载成功。"
else
  echo "⚠️ [DB_03] 缓存为空，从远程同步历史..."
  git clone --depth 1 "https://x-access-token:${MY_PAT}@github.com/rendie-com/rendie-sqlite3-shopee-product" temp_db03
  mkdir -p "$DB_03"
  cp -af temp_db03/$DB_03/. "$DB_03/"
  rm -rf temp_db03
fi