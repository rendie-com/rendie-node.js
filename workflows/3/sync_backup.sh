#!/bin/bash
set -e 

DAY_OF_YEAR=$(date +%-j)
MOD_RESULT=$(( DAY_OF_YEAR % 3 ))

if [ "$MOD_RESULT" -ne 0 ] && [ "$FORCE_BACKUP" != "true" ]; then
  echo "ℹ️ 今天是当年第 $DAY_OF_YEAR 天，未满 3 天周期，跳过远程备份推送。"
  exit 0
fi

echo "🚀 备份推送触发！正在处理远程数据同步..."
git config --global --add safe.directory "*"
ROOT_DIR=$(pwd)

SYNC_ITEMS="${DB_01}|rendie-sqlite3-shopee-marketing ${DB_02}|rendie-sqlite3-shopee-product"

for item in $SYNC_ITEMS; do
  LOCAL_PATH="${item%%|*}"
  REPO_NAME="${item##*|}"
  
  if [ ! -d "$ROOT_DIR/$LOCAL_PATH" ] || [ -z "$(ls -A "$ROOT_DIR/$LOCAL_PATH" 2>/dev/null)" ]; then
    echo "⚠️ 路径 $LOCAL_PATH 为空，跳过备份该目录。"
    continue
  fi

  TEMP_DIR="tmp_$REPO_NAME"
  rm -rf "$TEMP_DIR"
  
  git clone --depth 1 "https://x-access-token:${MY_PAT}@github.com/rendie-com/${REPO_NAME}.git" "$TEMP_DIR"
  
  mkdir -p "$TEMP_DIR/$LOCAL_PATH"
  cp -af "$ROOT_DIR/$LOCAL_PATH/." "$TEMP_DIR/$LOCAL_PATH/"
  
  (
    cd "$TEMP_DIR"
    git config user.email "action@github.com"
    git config user.name "GitHub Action"
    
    if [ -n "$(git status --porcelain)" ]; then
      git add .
      git commit -m "backup-sync: $(date '+%Y%m%d-%H%M')"
      git push origin main
      echo "✅ $REPO_NAME 远程备份同步成功。"
    else
      echo "ℹ️ $REPO_NAME 数据与线上一致，无变化，跳过推送。"
    fi
  )
  rm -rf "$TEMP_DIR"
done