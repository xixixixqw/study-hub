/**
 * Edge Function 健康诊断
 * 用法：node scripts/diagnose.mjs
 *
 * 检查项：
 *  1. 项目 URL 是否可达
 *  2. verify-group-code 是否已部署（区分 404 / 未部署）
 *  3. GROUP_CODE 是否配置（用错误暗号测：若返回 403 = 已配置；若返回 500「服务未配置」= 未配置）
 *  4. 正确暗号能否通过
 */
import { readFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// 读 .env.local
function loadEnv() {
  const p = join(root, '.env.local')
  if (!existsSync(p)) {
    console.error('✗ 找不到 .env.local')
    process.exit(1)
  }
  const out = {}
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}

const env = loadEnv()
const URL_BASE = (env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
const GROUP_CODE = '9班yyds' // 手册约定的暗号

if (!URL_BASE) {
  console.error('✗ .env.local 里没有 NEXT_PUBLIC_SUPABASE_URL')
  process.exit(1)
}

console.log(`项目 URL : ${URL_BASE}`)
console.log(`暗号     : ${GROUP_CODE}`)
console.log('')

const FN = `${URL_BASE}/functions/v1/verify-group-code`

/**
 * Node 内置 fetch（undici）不读 HTTP_PROXY 环境变量，
 * 在需要代理的网络下会直接 fetch failed。
 * 因此优先用 curl.exe —— 它走 Windows 系统代理设置。
 */
async function callViaCurl(payload) {
  const { execFile } = await import('child_process')
  const json = JSON.stringify(payload)
  const isWin = process.platform === 'win32'

  return new Promise((resolve) => {
    const args = isWin
      ? ['-sS', '-X', 'POST', FN, '-H', 'Content-Type: application/json',
         '-d', json, '-w', '\n__STATUS__%{http_code}']
      : ['-sS', '-X', 'POST', FN, '-H', 'Content-Type: application/json',
         '-d', json, '-w', '\n__STATUS__%{http_code}']

    execFile(isWin ? 'curl.exe' : 'curl', args, { timeout: 20000 }, (err, stdout, stderr) => {
      if (err && !stdout) {
        resolve({ status: 0, body: (stderr || err.message).trim().slice(0, 200), via: 'curl' })
        return
      }
      const m = String(stdout).match(/\n__STATUS__(\d{3})\s*$/)
      const status = m ? Number(m[1]) : 0
      const raw = String(stdout).replace(/\n__STATUS__\d{3}\s*$/, '')
      let body
      try {
        body = JSON.parse(raw)
      } catch {
        body = raw.slice(0, 200)
      }
      resolve({ status, body, via: 'curl' })
    })
  })
}

async function callViaFetch(payload) {
  try {
    const res = await fetch(FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const text = await res.text()
    let body
    try {
      body = JSON.parse(text)
    } catch {
      body = text.slice(0, 200)
    }
    return { status: res.status, body, via: 'fetch' }
  } catch (e) {
    return { status: 0, body: String(e.message || e), via: 'fetch' }
  }
}

/** 先 curl 后 fetch；任一成功即可 */
async function call(payload) {
  const a = await callViaCurl(payload)
  if (a.status > 0) return a
  const b = await callViaFetch(payload)
  if (b.status > 0) return b
  return { ...a, via: `${a.via}+${b.via}` }
}

// 1) 错暗号：用来探GROUP_CODE 是否配置
const wrong = await call({
  nickname: '诊断', qq: '', code: '__wrong__',
  auth_uid: '11111111-1111-1111-1111-111111111111',
})

console.log('【探测】错误暗号请求')
console.log(`  HTTP ${wrong.status}   (via ${wrong.via})`)
console.log(`  响应: ${JSON.stringify(wrong.body)}`)
console.log('')

if (wrong.status === 0) {
  console.log('✗ 请求没到达服务器（网络层就断了）')
  console.log('')
  console.log('Node 与 curl 都失败了，通常是代理问题：')
  console.log('')
  console.log('  · Node 内置 fetch 不读 HTTP_PROXY，curl.exe 走系统代理')
  console.log('  · 若开着 Clash/代理，确认「系统代理」已开启')
  console.log('')
  console.log('手动验证（复制去跑）：')
  console.log(`  curl.exe -X POST ${FN} \\`)
  console.log('    -H "Content-Type: application/json" \\')
  console.log(`    -d '{"nickname":"t","code":"x","auth_uid":"11111111-1111-1111-1111-111111111111"}' -w " HTTP:%{http_code}"`)
  console.log('')
  console.log('  看到 HTTP:404 → 函数没部署，代理是通的')
  console.log('  看到 HTTP:403 → 函数已部署，是暗号问题')
  console.log('  仍然连不上 → 先把代理打开再重试')
  process.exit(1)
}
if (wrong.status === 404) {
  console.log('✗ 网络通了，但函数未部署。执行：')
  console.log('    npx --yes supabase functions deploy verify-group-code --no-verify-jwt')
  process.exit(1)
}
if (wrong.status === 500 && String(wrong.body).includes('服务未配置')) {
  console.log('✗ 网络通了，但 GROUP_CODE 未配置。到 Dashboard → Edge Functions → Secrets 添加：')
  console.log('    GROUP_CODE = 9班yyds   （不带引号）')
  console.log('  加完后重新 deploy 函数')
  process.exit(1)
}
if (wrong.status === 500) {
  console.log('✗ 函数报 500，但原因不明。完整响应：')
  console.log('   ', JSON.stringify(wrong.body))
  process.exit(1)
}

// 2) 正确暗号
const right = await call({
  nickname: '__diagnostic__', qq: '', code: GROUP_CODE,
  auth_uid: '11111111-1111-1111-1111-111111111111',
})

console.log('【验证】正确暗号请求')
console.log(`  HTTP ${right.status}`)
console.log(`  响应: ${JSON.stringify(right.body).slice(0, 300)}`)
console.log('')

if (right.status === 200 && right.body?.ok) {
  console.log('✓ 函数工作正常！')
  console.log('')
  console.log('⚠️ 注意：诊断在 members 表留下一条 __diagnostic__ 记录，')
  console.log('   请到 Dashboard → Table editor → members 把它删掉。')
} else if (right.status === 403) {
  console.log('✗ 暗号不匹配。检查 Secrets 里 GROUP_CODE 的值（注意有无多余空格/引号）。')
} else {
  console.log('✗ 仍异常，把上面响应贴出来排查。')
}