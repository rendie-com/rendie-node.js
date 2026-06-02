#!/bin/bash
set -e

# 检查 1688 采集箱数据库
if [ -d "$DB_01" ] && [ "$(ls -A "$DB_01" 2>/dev/null)" ]; then
  echo "✅ [DB_01] 历史缓存加载成功。"
else
  echo "⚠️ [DB_01] 缓存未找到，开始从 1688 备份仓库下载初始数据接力..."
  git clone --depth 1 "https://x-access-token:${MY_PAT}@github.com/rendie-com/rendie-sqlite3-1688-crawler.git" temp_db01
  mkdir -p "$DB_01"
  cp -af temp_db01/$DB_01/. "$DB_01/"
  rm -rf temp_db01
fi