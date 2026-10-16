# 上线操作手册（照着敲· 修正版）

> ⚠️ **重要**：所有命令都带 `npx --yes`，不要漏。
> 少了 `--yes` 会卡在"是否安装"询问上，你输 `y` 后又接下一条命令，npm 会报 `canceled`。
>
> 全部在**你自己的 PowerShell** 里跑。

**项目目录**：`C:/Users/liyut/WorkBuddy/2026-10-16-23-00-06/study-hub`
**项目 ref**：`baciumlsxhbmbpajicof`

---

## 🔴 最卡人的一步（大概率会撞上）

### 必做 · 开匿名登录（忘了这个一定注册失败）

Dashboard → `Authentication` → `Providers`（有的版本叫 `Sign-in providers`）
→ 找到 **Anonymous Sign-Ins** → **打开开关**

**症状**：登记框点提交，红色报错

```
匿名登录失败：Anonymous sign-ins are disabled
```

**原因**：项目的匿名登录默认是关的。代码第一步调的就是 `supabase.auth.signInAnonymously()`，
被拒了后面全走不下去。

**验证**：开关打开后，浏览器刷新页面，重新登记，应该能进。

> 这个开关**随时能改**，不用重新跑 SQL、不用重新部署函数，改完刷新浏览器就生效。

---

## ⚡ 快速通道（只做这几条就能本地跑起来）

```powershell
cd "C:/Users/liyut/WorkBuddy/2026-10-16-23-00-06/study-hub"
npx --yes supabase login
npx --yes supabase link --project-ref baciumlsxhbmbpajicof
npx --yes supabase db push
npx --yes supabase functions deploy verify-group-code --no-verify-jwt
npx --yes supabase functions deploy send-deadline-reminders --no-verify-jwt
npm run dev
```

然后网页手动配两个 Secrets（见第 4 步），打开 http://localhost:3000 测试。

---

# 完整流程

## 第 0 步 · 进目录

```powershell
cd "C:/Users/liyut/WorkBuddy/2026-10-16-23-00-06/study-hub"
```

验证：
```powershell
pwd                   # 应显示 ...\2026-10-16-23-00-06\study-hub
dir .env.local        # 应能看到该文件
```

---

## 第 1 步 · 登录

```powershell
npx --yes supabase login
```

**会发生什么**：终端打印一个验证码链接（可能自动开浏览器）。

1. 浏览器跳到 Supabase → 用你的账号登录
2. 页面显示长验证码（形如 `xxxx-xxxx-xxxx`）
3. 复制，粘回终端，回车

**成功标志**：
```
Logged in.
```

浏览器没自动开的话，复制终端里那条 `https://supabase.com/cli/...` 到浏览器打开。

---

## 第 2 步 · 关联项目

```powershell
npx --yes supabase link --project-ref baciumlsxhbmbpajicof
```

**会问数据库密码**。

**密码在哪**：Dashboard → 你的项目 →左栏 `Database` → `Reset database` → 重设/显示。

> ⚠️ 输密码时屏幕**不显示任何字符**（连星号都没有），盲打完回车。这不是卡死。

**成功标志**：
```
Finished supabase link.
```

验证项目根目录多了配置：
```powershell
dir supabase\config.toml
```

---

## 第 3 步 · 推建表 SQL

```powershell
npx --yes supabase db push
```

会列出要建的东西，可能问是否继续 → 输 `y`。

**成功标志**：
```
Finished supabase db push.
```

### 验证表真的建好了（必做）

Dashboard → `SQL Editor` → 新建 → 粘贴执行：

```sql
select table_name from information_schema.tables
where table_schema = 'public' order by table_name;
```

**应该正好返回 6 行**：

| table_name |
|---|
| deadlines |
| member_preferences |
| materials |
| members |
| notifications |
| settings |

再顺手确认桶：Dashboard → `Storage` → 应有 public 的 `materials` 桶。

---

## 第 4 步 · 配 Secrets（只能网页，CLI 无替代）

Dashboard → `Edge Functions` → 顶部 `Secrets` → `Add new secret`

**第一条**

| Key | Value |
|---|---|
| `GROUP_CODE` | `9班yyds` |

**第二条**

| Key | Value |
|---|---|
| `ADMIN_EMAILS` | `2219158964@qq.com` |

⚠️ **值不带引号**，纯文本。带引号 → 暗号永远校验失败。

---

## 第 5 步 · 部署 Edge Functions

```powershell
npx --yes supabase functions deploy verify-group-code --no-verify-jwt
```

等 20-60 秒，看到：
```
✓ Deployed functions to https://baciumlsxhbmbpajicof.supabase.co/functions/v1/verify-group-code
```

```powershell
npx --yes supabase functions deploy send-deadline-reminders --no-verify-jwt
```

### 验证暗号接口活了

**测正确暗号**（PowerShell 里用单引号更省事）：
```powershell
curl.exe -X POST https://baciumlsxhbmbpajicof.supabase.co/functions/v1/verify-group-code -H "Content-Type: application/json" -d '{\"nickname\":\"tester\",\"qq\":\"2219158964\",\"code\":\"9班yyds\",\"auth_uid\":\"11111111-1111-1111-1111-111111111111\"}'
```

期望：`"ok":true` 且 `"role":"admin"`（因为 QQ 号命中了白名单）

**测错误暗号**（应该被拒）：
```powershell
curl.exe -X POST https://baciumlsxhbmbpajicof.supabase.co/functions/v1/verify-group-code -H "Content-Type: application/json" -d '{\"nickname\":\"x\",\"code\":\"wrong\",\"auth_uid\":\"11111111-1111-1111-1111-111111111111\"}'
```

期望：`"ok":false,"error":"群暗号不正确"`

> **测完去 Dashboard → Table editor → members 表，把 `tester` 那行删掉。**

---

## 第 6 步 · 本地试跑

```powershell
npm run dev
```

打开 http://localhost:3000

- 首页应弹出登记框
- 填昵称 + `9班yyds` → 应能进
- **刷新后不再弹登记框**（localStorage 生效）

---

## 第 7 步 · 登录 Vercel

```powershell
npx --yes vercel login
```

浏览器授权 → 回终端 → `Logged in`。

验证：
```powershell
npx --yes vercel whoami
```

应打印你的用户名。

---

## 第 8 步 · 部署前端

**方式 A（推荐，一条命令）**
```powershell
bash scripts/deploy.sh vercel
```

**方式 B（手动）**
```powershell
npx --yes vercel env add NEXT_PUBLIC_SUPABASE_URL production
```
粘贴：`https://baciumlsxhbmbpajicof.supabase.co`

```powershell
npx --yes vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
```
粘贴 anon key

```powershell
npx --yes vercel --prod
```

**成功标志**：
```
Production: https://xxx.vercel.app [copied to clipboard]
```

**把这个域名记下来**，第 9 步要用。

---

## 第 9 步 · 回填域名（不做，管理员登录会坏）

### 9a. 改 Site URL

Dashboard → `Authentication` → `URL Configuration`

| 字段 | 值 |
|---|---|
| `Site URL` | `https://你的域名.vercel.app` |
| `Redirect URLs` 加一行 | `https://你的域名.vercel.app/**` |

### 9b. 回填 APP_URL（邮件/推送才需要）

`Edge Functions` → `Secrets` → 加第三条：

| Key | Value |
|---|---|
| `APP_URL` | `https://你的域名.vercel.app` |

改完要重部署才生效：
```powershell
npx --yes supabase functions deploy send-deadline-reminders --no-verify-jwt
```

---

## 第 10 步 · 配 SMTP（管理员登录要）

Dashboard → `Authentication` → `Emails` → `SMTP Settings`

| 字段 | 值 |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | Resend API Key（`re_...`） |

不配 → `/login` 页面能开，但收不到邮件。

---

## 第 11 步 · 定时提醒（可选）

⚠️ SQL 里那段 pg_cron 是空转的（读了个没设过的 GUC），**必须手动注册**。

Dashboard → `SQL Editor`，执行（把占位换掉）：

```sql
select cron.schedule(
  'send-deadline-reminders',
  '7 * * * *',
  $$
  select net.http_post(
    url := 'https://baciumlsxhbmbpajicof.supabase.co/functions/v1/send-deadline-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer 你的service_role_key'
    ),
    body := '{}'::jsonb
  )
  $$
);
```

`service_role_key` 在 Dashboard → `Project Settings` → `API` → `service_role`（别拿成 anon）。

**建完手测**：
```powershell
curl.exe -X POST https://baciumlsxhbmbpajicof.supabase.co/functions/v1/send-deadline-reminders -H "Content-Type: application/json" -d "{}"
```

返回 `{"ok":true,...}` 即通。

---

# 上线自检

- [ ] 首页弹登记框，填 `9班yyds` 能进
- [ ] **刷新后不再弹**登记框
- [ ] 上传 pdf → 列表出现，含大小/图标/下载
- [ ] 建明天到期的 DDL → 看板分组正确
- [ ] 设置页关掉"显示 QQ 号" → 成员墙显示"QQ 隐藏"
- [ ] `/login` 收邮件进 `/admin`
- [ ] 手机浏览器打开 → 分享 → 二维码可扫
- [ ] QQ 里打开 → 弹"在浏览器打开"提示

---

# 报错对照

| 报错 | 原因 | 处理 |
|---|---|---|
| `Anonymous sign-ins are disabled` | **项目没开匿名登录** | `Authentication → Providers → Anonymous Sign-Ins` 打开 |
| `npm error canceled` | `npx` 询问安装时你接了下一条命令 | **加 `--yes`**：`npx --yes supabase ...` |
| `Access token not found` | 未登录/登录过期 | 重跑 `npx --yes supabase login` |
| `Invalid project ref` | ref 错了 | 应为 `baciumlsxhbmbpajicof`（不带 https） |
| `password authentication failed` | DB 密码错 | Dashboard → Database → Reset |
| `Cannot connect to project` | 网络问题 | 检查代理，`supabase.co` 常需梯子 |
| 函数返回 `服务未配置` | `GROUP_CODE` 没设 | 回第 4 步 |
| 暗号总是不对 | 引号问题 | 值不带引号（代码忽略大小写） |
| 上传报 400 | bucket 限制不对 | 重跑第 3 步 SQL |

**任何报错把原文整段贴给我。**