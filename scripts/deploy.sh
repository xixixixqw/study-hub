#!/usr/bin/env bash
# 一键部署脚本：把能自动化的步骤串起来
# 用法：
#   bash scripts/deploy.sh supabase     # Supabase 部分（需先登录 + link）
#   bash scripts/deploy.sh vercel       # Vercel 部分（需先 vercel login）
#   bash scripts/deploy.sh cron         # 注册 pg_cron 定时任务
#
# 前置：已在项目根目录，且 .env.local 已填好

set -euo pipefail

CLI_DIR="../.cli/node_modules/.bin"
SUPABASE="${CLI_DIR}/supabase"
VERCEL="${CLI_DIR}/vercel"

RED='\033[0;31m'; GRN='\033[0;32m'; YEL='\033[0;33m'; NC='\033[0m'

info()  { echo -e "${GRN}▶${NC} $1"; }
warn()  { echo -e "${YEL}!${NC} $1"; }
fail()  { echo -e "${RED}✗${NC} $1"; }

load_env() {
  if [[ -f .env.local ]]; then
    set -a; source .env.local; set +a
    info "已加载 .env.local"
  else
    fail ".env.local 不存在。复制 .env.example 为 .env.local 并填值"
    exit 1
  fi
}

deploy_supabase() {
  load_env
  info "检查登录状态…"
  if ! "$SUPABASE" projects list >/dev/null 2>&1; then
    fail "未登录。执行：npx supabase login"
    exit 1
  fi

  info "推送数据库迁移…"
  "$SUPABASE" db push

  info "部署 Edge Functions…"
  "$SUPABASE" functions deploy verify-group-code --no-verify-jwt
  "$SUPABASE" functions deploy send-deadline-reminders --no-verify-jwt

  warn "Secrets 需手动在 Dashboard 配（CLI 不便交互）："
  echo "    Edge Functions → Secrets → 添加："
  echo "      GROUP_CODE=9班yyds"
  echo "      ADMIN_EMAILS=2219158964@qq.com"
  echo -e "${GRN}✓${NC} Supabase 部分完成"
}

deploy_vercel() {
  load_env
  info "检查登录状态…"
  if ! "$VERCEL" whoami >/dev/null 2>&1; then
    fail "未登录。执行：npx vercel login"
    exit 1
  fi

  info "推送环境变量到 Vercel…"
  "$VERCEL" env add NEXT_PUBLIC_SUPABASE_URL production <<< "$NEXT_PUBLIC_SUPABASE_URL"
  "$VERCEL" env add NEXT_PUBLIC_SUPABASE_ANON_KEY production <<< "$NEXT_PUBLIC_SUPABASE_ANON_KEY"

  info "部署生产环境…"
  "$VERCEL" --prod --yes

  warn "上线后必须回填 Supabase："
  echo "    Authentication → URL Configuration → Site URL = 你的 vercel 域名"
  echo "    Edge Functions → Secrets → APP_URL = 你的 vercel 域名，然后重新 deploy 函数"
}

register_cron() {
  load_env
  if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
    fail "需要 SUPABASE_ACCESS_TOKEN 环境变量"
    echo "  获取：Dashboard → Account Preferences → Personal Access Tokens"
    exit 1
  fi
  if [[ -z "${SUPABASE_PROJECT_REF:-}" ]]; then
    fail "需要 SUPABASE_PROJECT_REF 环境变量（你的项目 ref，xxx.supabase.co 里的 xxx）"
    exit 1
  fi
  info "在 SQL Editor 执行 deploy-checklist.md 里的 pg_cron 语句"
  warn "service_role_key 属敏感信息，请勿贴到聊天或公开渠道"
  echo "  项目 ref: $SUPABASE_PROJECT_REF"
}

case "${1:-}" in
  supabase) deploy_supabase ;;
  vercel)   deploy_vercel ;;
  cron)     register_cron ;;
  *) echo "用法: bash scripts/deploy.sh {supabase|vercel|cron}" ; exit 1 ;;
esac