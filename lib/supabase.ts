import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'public-anon-key'

let browserClient: SupabaseClient | null = null

/** 浏览器端单例（带本地持久化，匿名登录 session 存 localStorage） */
export function getSupabase(): SupabaseClient {
  if (typeof window === 'undefined') {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    })
  }
  if (!browserClient) {
    browserClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'study-hub-auth',
      },
    })
  }
  return browserClient
}

export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
export const ALLOWED_EXT = [
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'jpg', 'png',
] as const
export type AllowedExt = (typeof ALLOWED_EXT)[number]

export const CATEGORIES = [
  '课件', '作业', '真题', '笔记', '竞赛', '项目', '其他',
] as const
export type Category = (typeof CATEGORIES)[number]

export const APP_NAME = '学习资料库'
export const GROUP_CODE_HINT = '向群管理员获取群暗号' // 真暗号只存在 Edge Function 环境变量