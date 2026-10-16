// 拿到真key 后自检：node /tmp/keycheck.mjs "你的key"
const k = process.argv[2] || '';
const parts = k.split('.');
const ok = (s) => {
  try { return JSON.parse(Buffer.from(s, 'base64').toString('utf8')); }
  catch { return null; }
};
if (parts.length !== 3) { console.log('✗ 不是三段式 JWT'); process.exit(1); }
const header = ok(parts[0]);
const payload = ok(parts[1]);
if (!header) { console.log('✗ 第1段无法解出 JSON → 不是合法 JWT'); process.exit(1); }
if (!payload) { console.log('✗ 第2段无法解出 JSON → 签名不合法'); process.exit(1); }
console.log('✓ 合法 JWT');
console.log('  header :', JSON.stringify(header));
console.log('  role   :', payload.role);
console.log('  iss    :', payload.iss);
console.log('  ref    :', payload.ref ?? '(无)');
if (payload.role !== 'anon') {
  console.log(`\n⛔ role 是 ${payload.role}，不是 anon！`);
  if (payload.role === 'service_role') console.log('   这是数据库超管权限密钥，请立刻在 Dashboard 重置！');
}
