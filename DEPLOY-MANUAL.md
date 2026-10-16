# 上线操作手册（照着敲）

> 全部命令在**你自己的终端**跑（PowerShell 或 Git Bash 都行）。
> 括号里 `#` 后面是注释，不用敲。

**项目目录**：`C:/Users/liyut/WorkBuddy/2026-10-16-23-00-06/study-hub`
**项目 ref**：`baciumlsxhbmbpajicof`

---

## 第0 步 · 进入目录（每开新终端都要先敲这条）

```bash
cd "C:/Users/liyut/WorkBuddy/2026-10-16-23-00-06/study-hub"
```

确认位置对不对：

```bash
pwd          # 应显示 .../2026-10-16-23-00-06/study-hub
ls .env.local # 应能看到这个文件
```

> ⚠️ `.env.local` 不存在说明你走错目录了，**不要继续**，先 cd 过来。

---

## 第 1 步 · 登录 Supabase

```bash
npx supabase login
```

**会发生什么**：终端打印一个一次性验证码，并自动打开浏览器。

1. 浏览器跳转到 Supabase → 用你的账号登录
2. 页面显示一个长验证码（形如 `xxxx-xxxx-xxxx`）
3. **复制它**，粘回终端，回车

**成功标志**：

```
Logged in.
```

**如果浏览器没自动打开**：把终端里打印的那条 `https://supabase.com/cli/...` 链接复制到浏览器打开。

---

## 第 2 步 · 关联项目

```bash
npx supabase link --project-ref baciumlsxhbmbpajicof
```

**会发生什么**：要你输数据库密码。

**密码在哪拿**：Dashboard → 你的项目 → 左栏 `Database` → `Reset database` → 会显示/让你重设一个密码。

> 输密码时**屏幕上不会显示任何字符**（连星号都没有），这是正常的，盲打完回车即可。

**成功标志**：

```
Finished supabase link.
```

**验证**：项目根目录应该多出一个 `supabase/config.toml`。

```bash
ls supabase/config.toml
```

---

## 第 3 步 · 推送建表 SQL

```bash
npx supabase db push
```

**会发生什么**：列出要执行的迁移，列出有哪些表会被创建。

**可能会问**：要不要继续 → 输 `y`。

**成功标志**：末尾出现

```
Finished supabase db push.
```

**验证表建好了没**（这步很重要，一定要做）：

```bash
npx supabase db dump --data-only --schema public > /dev/null && echo "SQL 可读"
```

或者更直接 —— **打开浏览器**访问
`https://supabase.com/dashboard/project/baciumlsxhbmbpajicof/editor`
在 SQL Editor 里跑：

```sql
select table_name from information_schema.tables
where table_schema = 'public' order by table_name;
```

**应该返回 6 张表**：

```
deadlines
member_preferences
materials
members
notifications
settings
```

再确认 Storage 桶：Dashboard → `Storage` → 应该有个 public 的 `materials` 桶。

---

## 第 4 步 · 配置 Secrets（CLI 做不了，必须网页）

**这一步没有命令行替代，别跳过。**

Dashboard → `Edge Functions` → 页面顶部 `Secrets` 按钮 → `Add new secret`

**第一条**

| Key | Value |
|---|---|
| `GROUP_CODE` | `9班yyds` |

**第二条**

| Key | Value |
|---|---|
| `ADMIN_EMAILS` | `2219158964@qq.com` |

⚠️ **两个值都不要带引号**，直接填纯文本。带引号会导致暗号永远校验失败。

搞定后页面上应该能看到这两个条目。

---

## 第 5 步 · 部署两个 Edge Function

```bash
npx supabase functions deploy verify-group-code --no-verify-jwt
```

等 20-60 秒，看到：

```
Deploying verify-group-code (v1)
✓ Deployed functions to https://baciumlsxhbmbpajicof.supabase.co/functions/v1/verify-group-code
```

然后第二个：

```bash
npx supabase functions deploy send-deadline-reminders --no-verify-jwt
```

同样等完成。

**验证暗号接口真的活了**（把下面整行复制去跑）：

```bash
curl -X POST https://baciumlsxhbmbpajicof.supabase.co/functions/v1/verify-group-code -H "Content-Type: application/json" -d "{\"nickname\":\"测试员\",\"qq\":\"2219158964\",\"code\":\"9班yyds\",\"auth_uid\":\"11111111-1111-1111-1111-111111111111\"}"
```

**期望返回**（`ok` 是 true）：

```json
{"ok":true,"member":{"nickname":"测试员","role":"admin",...}}
```

顺手测下错误暗号，应该被拒：

```bash
curl -X POST https://baciumlsxhbmbpajicof.supabase.co/functions/v1/verify-group-code -H "Content-Type: application/json" -d "{\"nickname\":\"x\",\"code\":\"wrong\",\"auth_uid\":\"11111111-1111-1111-1111-111111111111\"}"
```

期望返回 `"ok":false,"error":"群暗号不正确"`。

**测完去 Dashboard → `Table editor` → `members` 表，把 `测试员` 那一行删掉。**

---

## 第 6 步 · 登录 Vercel

```bash
npx vercel login
```

浏览器授权 → 回终端 → `Logged in`。

验证：

```bash
npx vercel whoami
```

应打印你的用户名（不是 `Error`）。

---

## 第 7 步 · 部署前端

**方式 A · 用我写好的脚本（推荐）**

```bash
bash scripts/deploy.sh vercel
```

它会自动读 `.env.local`、推环境变量、部署。

**方式 B · 手动三步**

```bash
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
```

粘贴：`https://baciumlsxhbmbpajicof.supabase.co` 回车

```bash
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
```

粘贴 anon key 回车（从 `.env.local` 里复制）

```bash
npx vercel --prod
```

**成功标志**：

```
Production: https://你的项目名.vercel.app [copied to clipboard]
```

**把这个域名记下来**，第 8 步要用。

---

## 第 8 步 · 回填域名（不做，管理员登录会坏）

### 8a. 改 Site URL

Dashboard → `Authentication` → `URL Configuration`

| 字段 | 改成 |
|---|---|
| `Site URL` | `https://你的域名.vercel.app` |
| `Redirect URLs`（新增一行） | `https://你的域名.vercel.app/**` |

### 8b. 回填 APP_URL（要邮件/推送才需要）

`Edge Functions` → `Secrets` → 加第三条：

| Key | Value |
|---|---|
| `APP_URL` | `https://你的域名.vercel.app` |

改完 Secrets **要重新部署才生效**：

```bash
npx supabase functions deploy send-deadline-reminders --no-verify-jwt
```

---

## 第 9 步 · 配SMTP（管理员登录要邮件）

Dashboard → `Authentication` → `Emails` → `SMTP Settings`

用 Resend 的 SMTP：

| 字段 | 值 |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | 你的 Resend API Key（`re_...`） |

不配的话 `/login` 页面能开，但点发送收不到邮件。

---

## 第 10 步 · 定时提醒（可选）

⚠️ **SQL 里那段 pg_cron 是空转的**（读了个你没设过的 GUC），必须手动注册。

Dashboard → `SQL Editor`，执行（把两处占位换掉）：

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

`service_role_key` 在 Dashboard → `Project Settings` → `API` → `service_role`（注意别拿成 anon）。

**建完立刻手测**：

```bash
curl -X POST https://baciumlsxhbmbpajicof.supabase.co/functions/v1/send-deadline-reminders -H "Content-Type: application/json" -d "{}"
```

返回 `{"ok":true,"scanned":0,...}` 就通了。

---

# 上线自检

按顺序过：

- [ ] 首页弹出登记框，填 `9班yyds` 能进
- [ ] **刷新后不再弹登记框**（localStorage 生效）
- [ ] 上传一个 pdf → 列表出现，含大小/图标/下载按钮
- [ ] 建个明天到期的 DDL → 看板分组正确
- [ ] 设置页关掉"显示 QQ 号"→ 成员墙变成"QQ 隐藏"
- [ ] `/login` 用 `2219158964@qq.com` 收邮件 → 进得去 `/admin`
- [ ] 手机浏览器打开 → 分享 → 二维码能扫
- [ ] QQ 里打开 → 弹"在浏览器打开"提示

---

# 出错了怎么办

| 报错关键词 | 原因 | 怎么办 |
|---|---|---|
| `Access token not found` | 没登录或登录过期 | 重跑 `npx supabase login` |
| `Invalid project ref` | ref 拼错了 | 应该是 `baciumlsxhbmbpajicof`（不带 https） |
| `password authentication failed` | DB 密码错 | Dashboard → Database → Reset 重设 |
| `Cannot connect to project` | 网络问题 | 检查梯子；supabase.co 可能需要代理 |
| `schema cache` 报错 | 建表没成功 | 重跑 `npx supabase db push` |
| 函数返回 `服务未配置` | `GROUP_CODE` 没设 | 回第 4 步 |
| 暗号总是不对 | 引号问题/大小写 | 值不带引号；代码是忽略大小写的 |
| 上传报 400 | bucket 限制不对 | 重跑第 3 步的 SQL |

**任何报错把原文整段贴给我**，别自己猜着改。

---

# 只想本地跑，不上线

```bash
cd "C:/Users/liyut/WorkBuddy/2026-10-16-23-00-06/study-hub"
npm run dev
```

打开 http://localhost:3000。需要第 1-5 步做完（数据库和函数在云上，前端跑本地）。