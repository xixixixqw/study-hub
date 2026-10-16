/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 允许通过环境变量切换构建输出目录（沙箱文件锁冲突时用）
  distDir: process.env.NEXT_DIST_DIR || '.next',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
}

module.exports = nextConfig