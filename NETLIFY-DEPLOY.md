# Netlify 部署配置（Vercel 要手机号时的替代方案）

> 前提：代码已推送到 `https://github.com/xixixixqw/study-hub`
> Netlify 免费版对 Next.js 支持 OK，个人项目足够用。

---

## 第 1 步 · 导入仓库

Netlify 首页 → **Import a Git repository** → 点 **GitHub**

选 `xixixixqw/study-hub` → **Connect**

---

## 第 2 步 · 填构建配置（**最关键，别跳**）

Netlify 会跳到配置页，或者手动进：
项目页 → **Site configuration** → **Build & deploy** → **Edit build command**

### Build command

```
npx next build
```

### Publish directory

```
.next
```

### Base directory

留空（不要填 `study-hub`）

### Node version

在 `Environment variables` 里加一条：

| Key | Value |
|---|---|
| `NODE_VERSION` | `20` |

---

## 第 3 步 · 环境变量（两处都要填）

### 3a. 构建时需要（Deploy 之前填）

Netlify 项目页 → **Environment variables** → **Add variable** → Scope 选 **All scopes**

```
NEXT_PUBLIC_SUPABASE_URL     = https://baciumlsxhbmbpajicof.supabase.co
```

```
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhY2l1bWxzeGhibWJwYWppY29mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNjE2OTIsImV4cCI6MjEwNzczNzY5Mn0.46fStytBJfOfoAqhxxpAOrTVlzWNTjumGZSLHfwQNn0
```

**必须加这条，否则构建时 `NEXT_PUBLIC_*` 是 undefined，页面会连到占位地址**

```
NODE_VERSION = 20
```

⚠️ **绝对不要加 `SUPABASE_SERVICE_ROLE_KEY`**

### 3b. 回填 Supabase（部署完）

拿到 Netlify 网址后 → Supabase → `Authentication` → `URL Configuration`
→ `Site URL` 改成 `https://xxx.netlify.app`
→ `Redirect URLs` 加一行 `https://xxx.netlify.app/**`

---

## 第 4 步 · 部署

点 **Deploy site** → 等 2-4 分钟

成功后会给你 `https://随机词.netlify.app`

想换好记的域名：**Site settings** → **Change site name** → 改成 `study-hub-xxx`

---

## 第 5 步 · 验证

打开网址，检查：

- [ ] 蓝色横幅 + 登记框弹出
- [ ] 暗号 `9班yyds` 能登记成功
- [ ] 刷新后不再弹登记框

---

## 常见问题

| 现象 | 原因 | 处理 |
|---|---|---|
| Build failed，日志报 `NEXT_PUBLIC_... is undefined` | 环境变量没在构建前填 | 回到第 3a 步，确认 Scope 是 All |
| Build failed，报 `Cannot find module` | Node 版本不对 | 加 `NODE_VERSION=20` |
| 构建成功但页面空白、连不上 Supabase | 环境变量作用域不对 | Scope 改成 All scopes |
| 页面 404 | Base directory 填错了 | 清空 Base directory |
| 部署成功但样式丢失 | Publish directory 不对 | 改成 `.next` |

**看构建日志**：项目页 → 顶部 **Deploys** → 点最近一次 → **Build log**

---

## 以后更新代码

```powershell
cd "C:/Users/liyut/WorkBuddy/2026-10-16-23-00-06/study-hub"
git add -A
git commit -m "描述改动"
git push
```

Netlify **自动重新部署**，网址不变。

---

## Netlify vs Vercel 差异

| 项 | Netlify | Vercel |
|---|---|---|
| 注册 | ✅ 不需手机号 | ❌ 要 |
| Next.js 支持 | 一般 | 最佳 |
| 中文网络速度 | 一般 | 一般 |
| 免费额度 | 300 构建小时/月 | 无限（个人） |

对你这个项目（几个班的人用）**完全够**。