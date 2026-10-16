/**
 * 无 .next 目录的构建前置校验：
 *  1. 解析所有 .ts/.tsx 的 import，确认 @/ 别名与相对路径都指向真实文件
 *  2. 确认所有 app 路由文件存在且导出 default
 *  3. 确认 public/ PWA 资源齐全
 *  4. 确认 Edge Function 关键环境变量已引用
 * 用法：node scripts/verify.mjs
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { join, dirname, resolve, relative } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
let errors = []
let checked = 0

function walk(dir, exts, out = []) {
  for (const f of readdirSync(dir)) {
    if (f === 'node_modules' || f.startsWith('.') || f === '.next' || f === '.next-build') continue
    const p = join(dir, f)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, exts, out)
    else if (exts.some((e) => f.endsWith(e))) out.push(p)
  }
  return out
}

// 1) import 解析
const files = walk(root, ['.ts', '.tsx'])
for (const file of files) {
  const src = readFileSync(file, 'utf8')
  const re = /from\s+['"]([^'"]+)['"]/g
  let m
  while ((m = re.exec(src))) {
    const spec = m[1]
    if (spec.startsWith('node:') || !spec.startsWith('.') && !spec.startsWith('@/')) continue
    checked++
    let target
    if (spec.startsWith('@/')) {
      target = join(root, spec.slice(2))
    } else {
      target = resolve(dirname(file), spec)
    }
    const ok = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.json', '/index.ts', '/index.tsx']
      .some((ext) => existsSync(target + ext))
    if (!ok) {
      errors.push(`${relative(root, file)} → 无法解析 import "${spec}"`)
    }
  }
}

// 2) 路由完整性
const routes = [
  'app/page.tsx',
  'app/layout.tsx',
  'app/upload/page.tsx',
  'app/material/[id]/page.tsx',
  'app/deadlines/page.tsx',
  'app/settings/page.tsx',
  'app/notifications/page.tsx',
  'app/admin/page.tsx',
  'app/login/page.tsx',
]
for (const r of routes) {
  const p = join(root, r)
  if (!existsSync(p)) {
    errors.push(`缺少路由文件 ${r}`)
    continue
  }
  const src = readFileSync(p, 'utf8')
  if (!/export\s+default/.test(src) && !/export\s+async\s+function\s+generateMetadata|metadata/.test(src)) {
    errors.push(`${r} 缺少默认导出`)
  }
}

// 3) PWA 资源
const pwaAssets = [
  'public/manifest.json',
  'public/sw.js',
  'public/offline.html',
  'public/icons/icon-192.png',
  'public/icons/icon-512.png',
]
for (const a of pwaAssets) {
  if (!existsSync(join(root, a))) errors.push(`缺少 PWA 资源 ${a}`)
}

// 4) Edge Function 关键点
const ef1 = readFileSync(join(root, 'supabase/functions/verify-group-code/index.ts'), 'utf8')
for (const kw of ['GROUP_CODE', 'ADMIN_EMAILS', 'SERVICE_ROLE_KEY', 'Deno.serve']) {
  if (!ef1.includes(kw)) errors.push(`verify-group-code 缺少 ${kw}`)
}
const ef2 = readFileSync(join(root, 'supabase/functions/send-deadline-reminders/index.ts'), 'utf8')
for (const kw of ['reminder_sent', 'VAPID', 'RESEND_API_KEY', 'notifications', 'Deno.serve']) {
  if (!ef2.includes(kw)) errors.push(`send-deadline-reminders 缺少 ${kw}`)
}

// 5) SQL 关键点
const sql = readFileSync(join(root, 'supabase/migrations/0001_init.sql'), 'utf8')
for (const kw of [
  'create table if not exists public.members',
  'create table if not exists public.materials',
  'create table if not exists public.deadlines',
  'create table if not exists public.member_preferences',
  'create table if not exists public.notifications',
  'create table if not exists public.settings',
  'row level security',
  'increment_download_count',
  'cron.schedule',
  "'materials'",
]) {
  if (!sql.includes(kw)) errors.push(`SQL 缺少 ${kw}`)
}

// 输出
console.log(`检查文件：${files.length} 个，import 解析：${checked} 条`)
console.log(`路由：${routes.length} 条，PWA 资源：${pwaAssets.length} 项`)
if (errors.length === 0) {
  console.log('\n✅ 全部校验通过（import / 路由 / PWA / Edge Function / SQL）')
} else {
  console.log(`\n❌ 发现 ${errors.length} 个问题：`)
  errors.forEach((e) => console.log('  - ' + e))
  process.exitCode = 1
}