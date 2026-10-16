# ===== 部署前置检查清单 =====
# 逐项确认后再上线，漏一项就有一项功能是坏的

## A. 必做（不做则核心功能不可用）

- [ ] Supabase 已开 **Anonymous Sign-Ins**（Authentication → Providers）
      ↳ 不开 → 登记框点提交直接报「匿名登录失败」
- [ ] 已执行 `supabase/migrations/0001_init.sql`
- [ ] Storage 里有 public 的 `materials` bucket，大小限制 52428800
- [ ] Edge Function Secrets 已设 `GROUP_CODE=9班yyds`
- [ ] Edge Function Secrets 已设 `ADMIN_EMAILS=2219158964@qq.com`
      ↳ 注意：**不要带引号**，带了暗号比对永远失败
- [ ] 两个 Edge Function 已 deploy（verify-group-code / send-deadline-reminders）
- [ ] Vercel 已配 `NEXT_PUBLIC_SUPABASE_URL` 与 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
      ↳ **绝对不要**把 service_role_key 放到 Vercel 或前端

## B. 管理员功能（不做则 /admin 进不去）

- [ ] Supabase Authentication → SMTP 已配置
- [ ] Vercel 上线后回填 `Authentication → URL Configuration → Site URL`
- [ ] `Redirect URLs` 加 `https://<你的域名>/**`
- [ ] 用 `2219158964@qq.com` 登记（QQ 号命中白名单才自动是 admin）

## C. 提醒功能（可选）

- [ ] 要邮件：Secrets 加 `RESEND_API_KEY` + `REMINDER_FROM`
- [ ] 要推送：Secrets 加 `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY`
- [ ] 两者都要加 `APP_URL=https://<你的域名>`（否则提醒里的按钮跳占位地址）
- [ ] pg_cron 手动注册（SQL 里那段依赖未设的 GUC，是空转的）

## D. 上线后自检

- [ ] 首页弹出登记框，填 `9班yyds` 能进
- [ ] 刷新页面**不再弹**登记框（localStorage 生效）
- [ ] 上传 pdf → 列表出现，含大小/图标/下载按钮
- [ ] 建明天到期的 DDL → 看板分组正确
- [ ] `/login` 能收到邮件并进 `/admin`
- [ ] 手机浏览器打开 → 分享 → 二维码可扫
- [ ] QQ 内打开 → 弹出「在浏览器打开」提示