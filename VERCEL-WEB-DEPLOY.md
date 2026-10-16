# Vercel 网页部署指引（CLI 走不通时的方案）

> 适用场景：`npx vercel login` 报
> `TypeError: Cannot convert argument to a ByteString`
> 这是 PowerShell 中文编码问题，与项目无关。改用网页部署完全绕开。

全程**不需要终端**，只需要浏览器 + GitHub 账号。

---

## 第 1 步 · 把代码传到 GitHub

### 1.1 新建仓库（网页）

打开 `https://github.com/new` → 直接点 **Create repository**

| 字段 | 填什么 |
|---|---|
| Repository name | `study-hub` |
| 可见性 | 建议 **Private**（自己存的资料系统） |

**不要勾**任何 `Add a README` / `.gitignore` / License。

### 1.2 推送代码（终端，两条）

复制你的仓库地址（GitHub 页面右上角绿色 **Code** 按钮 → HTTPS），然后：

```powershell
cd "C:/Users/liyut/WorkBuddy/2026-10-16-23-00-06/study-hub"
git remote add origin https://github.com/你的用户名/study-hub.git
git push -u origin master
```

> 推送时可能要求登录 GitHub，用**个人访问令牌（PAT）**而非密码：
> GitHub → Settings → Developer settings → Personal access tokens → Generate，
> 勾 `repo` 权限，复制那串 `ghp_...` 当密码用。

---

## 第 2 步 · 导入到 Vercel

1. 打开 `https://vercel.com/new`
2. 点 **Add New... → Project**
3. 找到 `study-hub` 仓库 → 点 **Import**

**Vercel 会自动识别**：
- Framework Preset: `Next.js`（不要改）
- Build Command: `next build`（不要改）
- Install Command: `npm install`（不要改）
- Output Directory: `.next`（不要改）

---

## 第 3 步 · 填环境变量（关键一步）

点 **Environment Variables**，一条一条加：

### 第一条

| 字段 | 值 |
|---|---|
| Key | `NEXT_PUBLIC_SUPABASE_URL` |
| Value | `https://baciumlsxhbmbpajicof.supabase.co` |

### 第二条

| 字段 | 值 |
|---|---|
| Key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Value | `eyJqsPjvReYSNeB9PhZpZmF7pBN4TmgKHUN4.vjGrj8FfUpFgoWPgIhLdMHFmQuLpUyN8HpEjV7d2wIyhgTesuKNkEHwbO45lOacrmo6aFXS2KuUso87aQXOyIRKgTcT7EWHeHyY3RAEoUwI9pYP1IxLpCiffTaQ4Ef4.63kNsnmYXcHzjSaehedUPyHUkoKHEwpwEHXYUcoYAr5` |

⚠️ **绝对不要加 `SUPABASE_SERVICE_ROLE_KEY`** —— 那是数据库超管权限，泄露等于整个数据库公开。

**环境勾选**：Production / Preview / Development 三个都勾上（默认就是）。

---

## 第 4 步 · 部署

点 **Deploy** → 等 2-3 分钟 → 出现绿色 **Congratulations** 和一个网址，形如：

```
https://study-hub-xxx.vercel.app
```

**这个网址就是能发群里的链接。**

---

## 第 5 步 · 回填域名（必做，漏了管理员登录会坏）

Vercel 给你的域名复制出来，然后回 Supabase：

### 5a. 改 Site URL

`https://supabase.com/dashboard/project/baciumlsxhbmbpajicof/auth/url-configuration`

| 字段 | 值 |
|---|---|
| Site URL | `https://study-hub-xxx.vercel.app` |
| Redirect URLs（加一行） | `https://study-hub-xxx.vercel.app/**` |

点 **Save**。

### 5b. 回填 APP_URL（邮件/推送要用，可选）

`Edge Functions` → `Secrets` → 加一条：

| Key | Value |
|---|---|
| `APP_URL` | `https://study-hub-xxx.vercel.app` |

改完 Secrets 要重新部署函数才生效：

```powershell
npx --yes supabase functions deploy send-deadline-reminders --no-verify-jwt
```

---

## 第 6 步 · 验证

浏览器打开 Vercel 给的网址，应该看到：

- [ ] 蓝色横幅 + 登记框弹出（**说明线上环境正常**）
- [ ] 用暗号 `9班yyds` 登记成功
- [ ] 刷新后不再弹登记框
- [ ] 手机打开 → 分享 → 二维码可扫

---

## 后续更新代码

每次改了代码重新部署：

```powershell
cd "C:/Users/liyut/WorkBuddy/2026-10-16-23-00-06/study-hub"
git add -A
git commit -m "描述你的改动"
git push
```

Vercel 会**自动检测到推送并重新部署**，不用管。

也可以在 Vercel 项目页点 **Deployments → 右侧 ⋮ → Redeploy** 手动触发。

---

## 出错了怎么办

| 现象 | 原因 | 处理 |
|---|---|---|
| Build 失败，日志报模块找不到 | 依赖没装全 | 检查构建日志里的包名 |
| 部署成功但登记报连不上 | 环境变量没填 | 回第 3 步重填并Redeploy |
| 页面样式全丢 | Tailwind 没编译 | 看构建日志有无 CSS 报错 |
| Vercel 一直 Building | 免费额度用完 | Dashboard 看用量 |

**Build 失败时看日志**：Vercel 项目页 → Deployments → 点最新那次 → **View Function Logs** 或 **Build Logs**，有完整报错。

---

## 更省事的做法（如果你不想折腾 GitHub）

Vercel 也支持**直接上传文件夹**：

1. 本地先打包（排除 node_modules）：
   ```powershell
   cd "C:/Users/liyut/WorkBuddy/2026-10-16-23-00-06"
   ```
   在 `study-hub` 目录下选「发送到 → 压缩(zipped)文件夹」，得到 `study-hub.zip`
2. `https://vercel.com/new` → 点 **Deploy**（不是 Project）→ 上传这个 zip

⚠️ 这种方式每次更新都要重新上传，且**容易把 `.env.local` 一起打包进去**（里面有 anon key）。
虽然 anon key 本来就是公开的，但建议上传前确认压缩包里没有 `.env.local`。
**推荐还是走 GitHub。**