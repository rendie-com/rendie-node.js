#!/bin/bash
set -e

DAY_OF_YEAR=$(date +%-j)
MOD_RESULT=$(( DAY_OF_YEAR % 3 ))
CURRENT_HOUR=$(date +%H)

# 智能双重关卡控制：未满 3 天周期且未声明强制备份，直接优雅退出
if [ "$MOD_RESULT" -ne 0 ] && [ "$FORCE_BACKUP" != "true" ]; then
  echo "ℹ️ 今天是当年第 $DAY_OF_YEAR 天，未满 3 天备份周期，跳过推送。"
  exit 0
fi

# 在满足3天周期的日子里，仅在每天的第一个执行周期（凌晨4点前）执行自动备份，防止高频重复备份
if [ "$FORCE_BACKUP" != "true" ] && [ "$CURRENT_HOUR" -ge 4 ]; then
  echo "ℹ️ 今日已在凌晨成功完成常规备份，当前周期 (${CURRENT_HOUR}点) 无需重复推送。"
  exit 0
fi

echo "🚀 1688 远程增量备份同步任务被触发，开始安全校验..."
git config --global --add safe.directory "*"
ROOT_DIR=$(pwd)

if [ ! -d "$ROOT_DIR/$DB_01" ] || [ -z "$(ls -A "$ROOT_DIR/$DB_01" 2>/dev/null)" ]; then
  echo "⚠️ 路径 $DB_01 无有效内容，跳过该库备份。"
  exit 0
fi

REPO_NAME="rendie-sqlite3-1688-crawler"
TEMP_DIR="tmp_$REPO_NAME"
rm -rf "$TEMP_DIR"

git clone --depth 1 "https://x-access-token:${MY_PAT}@github.com/rendie-com/${REPO_NAME}.git" "$TEMP_DIR"

mkdir -p "$TEMP_DIR/$DB_01"
cp -af "$ROOT_DIR/$DB_01/." "$TEMP_DIR/$DB_01/"

(
  cd "$TEMP_DIR"
  git config user.email "action@github.com"
  git config user.name "GitHub Action"
  
  if [ -n "$(git status --porcelain)" ]; then
    git add .
    git commit -m "backup-sync: $(date '+%Y%m%d-%H%M')"
    git push origin main
    echo "✅ 异地备份库 $REPO_NAME 增量更新同步成功。"
  else
    echo "ℹ️ $REPO_NAME 数据资产未发生结构变化，无需提交。"
  fi
)
rm -rf "$TEMP_DIR"