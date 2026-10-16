/**
 * Supabase 密钥自检
 * 用法：node scripts/check-key.mjs "你的key"
 *
 * 两种合法格式都支持：
 *  1. JWT 三段式（经典）→ 解出 payload 校验 role / ref
 *  2. sb_publishable_xxx（新版）→ 前缀直接判定
 */
const k = process.argv[2] || ''

if (!k) {
  console.log('用法：node scripts/check-key.mjs "你的key"')
  process.exit(1)
}

// ---- 新版 publishable key ----
if (k.startsWith('sb_publishable_')) {
  console.log('✓ 新版 Publishable key（前端可用）')
  console.log('  前缀: sb_publishable_')
  process.exit(0)
}

// ---- 经典 JWT ----
const parts = k.split('.')
if (parts.length !== 3) {
  console.log('✗ 不是三段式 JWT，也不是 sb_publishable_ 格式')
  process.exit(1)
}

const decode = (s) => {
  try {
    return JSON.parse(Buffer.from(s, 'base64').toString('utf8'))
  } catch {
    return null
  }
}

const header = decode(parts[0])
const payload = decode(parts[1])

if (!header) {
  console.log('✗ 第 1 段无法解出 JSON → 不是合法 JWT（可能被截断或字符被替换）')
  process.exit(1)
}
if (!payload) {
  console.log('✗ 第 2 段无法解出 JSON → 不是合法 JWT')
  process.exit(1)
}

console.log('✓ 合法 JWT')
console.log('  header:', JSON.stringify(header))
console.log('  role  :', payload.role)
console.log('  iss   :', payload.iss)
console.log('  ref   :', payload.ref ?? '(无)')
if (payload.exp) {
  console.log('  有效期:', new Date(payload.exp * 1000).toISOString().slice(0, 10))
}

if (payload.role !== 'anon') {
  console.log(`\n⛔ role 是 ${payload.role}，不是 anon！`)
  if (payload.role === 'service_role') {
    console.log('这是数据库超管权限密钥。请立刻到 Dashboard 重置，且勿放入前端。')
  }
  process.exit(1)
}