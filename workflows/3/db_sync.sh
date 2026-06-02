#!/bin/bash
set -e

if [ -d "$DB_01" ] && [ "$(ls -A "$DB_01" 2>/dev/null)" ]; then
  echo "✅ [DB_01] 历史缓存加载成功。"
else
  echo "⚠️ [DB_01] 缓存为空，从远程同步历史..."
  git clone --depth 1 "https://x-access-token:${MY_PAT}@github.com/rendie-com/rendie-sqlite3-shopee-marketing" temp_db_01
  mkdir -p "$DB_01"
  cp -af temp_db_01/$DB_01/. "$DB_01/"
  rm -rf temp_db_01
fi

if [ -d "$DB_02" ] && [ "$(ls -A "$DB_02" 2>/dev/null)" ]; then
  echo "✅ [DB_02] 历史缓存加载成功。"
else
  echo "⚠️ [DB_02] 缓存为空，从远程同步历史..."
  git clone --depth 1 "https://x-access-token:${MY_PAT}@github.com/rendie-com/rendie-sqlite3-shopee-product" temp_db_02
  mkdir -p "$DB_02"
  cp -af temp_db_02/$DB_02/. "$DB_02/"
  rm -rf temp_db_02
fi