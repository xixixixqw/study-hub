# 学习资料库 · 部署手册

QQ 群成员资料共享库 + DDL 提醒 PWA。移动端优先，蓝白风格。

---

## 一、技术栈与功能

| 层 | 选型 |
|---|---|
| 前端 | Next.js 14 App Router + TypeScript + Tailwind + 手写 shadcn（radix 原语） |
| 后端 | Supabase（Postgres + 匿名登录 + Storage + Edge Functions + pg_cron） |
| 部署 | Vercel |
| 可选 | Resend（邮件）、VAPID（Web Push） |

固定信息：群暗号 `9班yyds`，管理员 `2219158964@qq.com`，允许 pdf/doc/docx/xls/xlsx/ppt/pptx/zip/jpg/png，单文件 ≤ 50MB。

---

## 二、本地跑起来

```bash
cd study-hub
npm install
cp .env.example .env.local   # 填入 Supabase 的 URL 与 anon key
npm run dev                  # http://localhost:3000
```

---

## 三、Supabase 配置（顺序别搞反）

### 1. 建项目 + 开匿名登录

Dashboard → Authentication → Providers → **Anonymous Sign-Ins** 打开。

> 不开匿名登录，登记流程会在第一步就失败。

### 2. 执行 SQL 建表

Dashboard → SQL Editor → 粘贴 `supabase/migrations/0001_init.sql` 整段执行。

一次到位的内容：6 张表、索引、`updated_at`/上传数/偏好三触发器、3 个 RPC、**全部 RLS 策略**、`materials` Storage bucket（含 50MB 与 MIME 白名单）、pg_cron 注册。

> bucket 也可以手工建：Dashboard → Storage → New bucket，名字 `materials`，**Public** 打开，大小限制 `52428800`。

### 3. 配置 Edge Function Secrets

Dashboard → Edge Functions → Secrets：

```
GROUP_CODE=9班yyds
ADMIN_EMAILS=2219158964@qq.com
```

可选（要推送/邮件才配）：

```
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
RESEND_API_KEY=re_xxx
REMINDER_FROM=学习资料库 <noreply@yourdomain.com>
APP_URL=https://your-app.vercel.app
```

### 4. 部署 Edge Functions

需要 Supabase CLI：

```bash
supabase login
supabase link --project-ref <你的项目 ref>
supabase functions deploy verify-group-code --no-verify-jwt
supabase functions deploy send-deadline-reminders --no-verify-jwt
```

CLI 不方便时，在 Dashboard → Edge Functions → 新建函数，粘贴 `supabase/functions/<name>/index.ts` 内容。

### 5. 管理员邮箱登录（SMTP）

`/login` 用邮件 OTP 登录，需先配置：

- Dashboard → Authentication → URL Configuration → Site URL 填你的 Vercel 域名
- Authentication → Emails → SMTP 填（Resend 的 SMTP 也可）

### 6. 提升管理员

暗号登记时若 QQ 号命中 `ADMIN_EMAILS`，会自动 `role='admin'`。若已登记过，手动提升：

```sql
update public.members set role = 'admin' where qq = '2219158964';
```

### 7. pg_cron

`0001_init.sql` 末尾已注册（每小时第 7 分钟）。需要 `app.settings` 里有凭证，或直接改用 Dashboard → Database → Cron Jobs 手动建：

| 字段 | 值 |
|---|---|
| 任务名 | `send-deadline-reminders` |
| 调度 | `7* * * *`（每分钟用 `* * * * *`） |
| 类型 | HTTP POST |
| URL | `https://<ref>.supabase.co/functions/v1/send-deadline-reminders` |
| Header | `Content-Type: application/json` + `Authorization: Bearer <service_role_key>` |

> 建议先手动 POST 一次验证返回 `{"ok":true,...}` 再挂 cron。

---

## 四、部署到 Vercel

### 命令行

```bash
npm i -g vercel
vercel
# 环境变量：
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel --prod
```

### 面板

1. Vercel → Add New → Project → 导入仓库
2. Framework Preset 自动识别 Next.js，Build Command 保持默认
3. Settings → Environment Variables 加上面两个 `NEXT_PUBLIC_*`
4. Deploy

**上线后回来补一步**：Supabase → Authentication → URL Configuration，把 Site URL 改成 Vercel 正式域名（否则邮件 OTP 跳回 localhost）。

---

## 五、发到 QQ 群 / 二维码 / 加桌面

### 发链接

线上首页右上角 **分享** 按钮 → 复制链接，或直接截二维码图发群里。也可以用任意在线二维码工具把 `https://你的域名/` 生成二维码。

### 二维码

`components/share-sheet.tsx` 内置 `qrcode` 库实时生成，无需额外配置。

### 添加到手机桌面

| 环境 | 操作 |
|---|---|
| QQ / 微信内置浏览器 | **不支持**。点右上角「···」→ 在浏览器打开 → 再添加到桌面。应用内会自动弹此提示 |
| Chrome / Edge（Android） | 地址栏右侧「安装」图标 → 安装 |
| Chrome（桌面） | 地址栏右侧「安装」图标 |
| iOS Safari | 分享 → 添加到主屏幕 |
| Android Chrome 菜单 | ⋮ → 添加到主屏幕 |

### 建一个稳定群链接

`study-hub.vercel.app` 之类的域名最好固定一个（Vercel 项目名即域名，不要改），发群里一次，以后永不失效。

---

## 六、目录结构

```
study-hub/
├── app/
│   ├── layout.tsx              # 根布局 + MemberProvider
│   ├── page.tsx                # 首页：成员墙/资料/DDL 按偏好渲染
│   ├── globals.css             # 蓝白主题 CSS 变量
│   ├── upload/page.tsx         # 拖拽多文件上传 + 进度条
│   ├── material/[id]/page.tsx  # 详情：预览/下载/复制链接/删除/置顶
│   ├── deadlines/page.tsx      # DDL 看板 + .ics 导出
│   ├── settings/page.tsx       # 隐藏显示 / 模块开关排序 / 通知
│   ├── notifications/page.tsx  # 站内通知
│   ├── admin/page.tsx          # 管理后台
│   └── login/page.tsx          # 管理员邮件 OTP
├── components/
│   ├── app-shell.tsx           # 顶栏 + 底部导航 + 全局弹窗编排
│   ├── register-dialog.tsx     # 登记框
│   ├── ddl-alert-dialog.tsx    # 24h 到期弹窗
│   ├── in-app-hint.tsx         # QQ 内置浏览器提示
│   ├── member-wall.tsx         # 成员墙（按他人偏好脱敏）
│   ├── material-card.tsx
│   ├── material-list.tsx       # 搜索 + 分类筛选
│   ├── deadline-card.tsx
│   ├── deadline-board.tsx      # 今天/本周/即将/已完成分组
│   ├── deadline-dialog.tsx
│   ├── share-sheet.tsx         # 复制链接 + 二维码
│   ├── avatar-picker.tsx
│   └── ui/                     # button/card/input/dialog/switch/badge/tabs/states
├── lib/
│   ├── supabase.ts             # 客户端 + 常量（允许类型/50MB/分类）
│   ├── types.ts                # 全部类型契约
│   ├── utils.ts                # 脱敏/格式化/分组/ics 时间计算
│   ├── api.ts                  # 全部数据操作
│   ├── register.ts             # 暗号校验 + 匿名登录编排
│   ├── member-context.tsx      # 成员/偏好状态（含 localStorage 同步）
│   ├── ics.ts                  # .ics 生成
│   ├── pwa.ts                  # 环境探测/通知/复制/装桌面/SW
│   └── use-deadline-watcher.ts # 24h 巡检提醒
├── supabase/
│   ├── migrations/0001_init.sql
│   └── functions/{verify-group-code,send-deadline-reminders}/index.ts
├── public/
│   ├── manifest.json  sw.js  offline.html  icons/
└── scripts/
    ├── gen_icons.py            # 生成 PWA 图标
    └── verify.mjs              # 无需构建的完整性校验
```

---

## 七、安全设计要点

- **群暗号绝不进前端**：只在 Edge Function 环境变量，前端拿不到
- **`members` 表写入仅 service_role**：RLS 不给 anon/authenticated 写权限，绕过登记流程直接插库不可行
- **DDL 私有性在数据库层生效**：`visibility='public' OR member_id=current_member_id() OR is_admin()`，不是靠前端藏
- **`member_preferences` 仅 owner/admin 可读写**
- **搜索过滤下推到 SQL**（`or(title.ilike...)`），不捞全表在应用层过滤
- **下载计数走 security definer RPC**，不暴露写权限
- **存储桶公开读 + 登录写**；上传失败会清理孤儿文件
- **文件类型/大小前后端双重校验**：前端即时反馈，Storage 层再兜一次

---

## 八、常见问题

**登记提示"匿名登录失败"**
→ Supabase Authentication 里没开 Anonymous Sign-Ins。

**暗号总是不对**
→ 检查 Edge Function Secrets 的 `GROUP_CODE`，注意别带了引号或空格。改完要重新部署函数。

**文件上传 400 / 超限**
→ bucket 的 `file_size_limit` 必须是 52428800，`allowed_mime_types` 要含对应类型。重新执行 SQL 即可修正。

**DDL 看板空白**
→ RLS 生效中。私有 DDL 只有 owner 和 admin 能看到；确认登录态正常。

**提醒没触发**
→ 手动 POST 一次 `send-deadline-reminders` 看返回。再查 `deadlines.reminder_sent` 是否已置 true（true 就不会重复发，这是防重复设计）。

**QQ 里打不开桌面版**
→ 内置浏览器不支持，必须「···」→ 在浏览器打开。应用内已有提示浮层。

**改了 SQL 但不生效**
→ RLS 策略改动需要重新执行 SQL；Edge Function 改动需要 `supabase functions deploy` 重新部署。