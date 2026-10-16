// 生成 PWA 图标：node scripts/gen-icons.mjs
// 用法：npm i sharp --no-save && node scripts/gen-icons.mjs
// 蓝白圆角图标，中间白色「资」字
import { createCanvas } from 'canvas'
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

function makeIcon(size, maskable = false) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  const pad = maskable ? size * 0.14 : 0
  const inner = size - pad * 2

  // 背景：蓝色渐变圆角方块
  const grad = ctx.createLinearGradient(0, 0, size, size)
  grad.addColorStop(0, '#3b82f6')
  grad.addColorStop(1, '#1d4ed8')

  ctx.fillStyle = '#2563eb'
  if (maskable) {
    // maskable 铺满整块，避免裁切露白
    ctx.fillRect(0, 0, size, size)
  } else {
    const r = size * 0.22
    ctx.beginPath()
    ctx.moveTo(r, 0)
    ctx.arcTo(size, 0, size, size, r)
    ctx.arcTo(size, size, 0, size, r)
    ctx.arcTo(0, size, 0, 0, r)
    ctx.arcTo(0, 0, size, 0, r)
    ctx.closePath()
    ctx.fill()
  }

  ctx.fillStyle = grad
  ctx.globalAlpha = 0.55
  if (maskable) ctx.fillRect(0, 0, size, size)
  else ctx.fill()
  ctx.globalAlpha = 1

  // 中间「资」字（白色 + 轻微阴影）
  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.12)'
  ctx.font = `bold ${Math.round(inner * 0.52)}px "PingFang SC", "Microsoft YaHei", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('资', size / 2 + pad * 0.1, size / 2 + pad * 0.1 + inner * 0.02)
  ctx.fillStyle = '#ffffff'
  ctx.fillText('资', size / 2 + pad, size / 2 + pad)
  ctx.restore()

  return canvas
}

for (const [name, size, maskable] of [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true],
  ['apple-touch-icon.png', 180, false],
]) {
  const buf = makeIcon(size, maskable).toBuffer('image/png')
  writeFileSync(join(outDir, name), buf)
  console.log(`✓ ${name} (${size}x${size})`)
}
console.log('图标生成完成 →', outDir)