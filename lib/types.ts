export type Role = 'member' | 'admin'
export type DeadlineVisibility = 'public' | 'private'
export type DeadlineStatus = 'todo' | 'done'
export type RemindBefore = '0' | '1h' | '1d' | '3d'

export interface Member {
  id: string
  auth_uid: string
  nickname: string
  qq: string | null
  avatar_color: string
  avatar_url: string | null
  role: Role
  upload_count: number
  created_at: string
  last_seen_at: string
}

export interface Material {
  id: string
  member_id: string
  uploader_nickname: string
  title: string
  description: string | null
  category: string
  file_path: string
  file_url: string | null
  file_size: number
  mime_type: string | null
  download_count: number
  is_pinned: boolean
  created_at: string
}

export interface Deadline {
  id: string
  member_id: string
  title: string
  description: string | null
  due_at: string
  remind_at: string | null
  remind_before: RemindBefore
  visibility: DeadlineVisibility
  status: DeadlineStatus
  related_material_id: string | null
  reminder_sent: boolean
  created_at: string
  updated_at: string
}

export type ModuleKey = 'memberWall' | 'materials' | 'deadlines' | 'upload'

export interface MemberPreferences {
  member_id: string
  show_qq: boolean
  show_upload_count: boolean
  show_join_time: boolean
  show_my_deadlines_public: boolean
  visible_modules: Record<ModuleKey, boolean>
  module_order: ModuleKey[]
  hidden_deadline_ids: string[]
  theme: 'light' | 'dark'
  push_enabled: boolean
  email_enabled: boolean
  push_subscription: Record<string, unknown> | null
  updated_at: string
}

export interface AppNotification {
  id: string
  member_id: string
  type: string
  title: string
  content: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

export const DEFAULT_PREFERENCES: MemberPreferences = {
  member_id: '',
  show_qq: false,
  show_upload_count: true,
  show_join_time: true,
  show_my_deadlines_public: true,
  visible_modules: {
    memberWall: true,
    materials: true,
    deadlines: true,
    upload: true,
  },
  module_order: ['memberWall', 'materials', 'deadlines'],
  hidden_deadline_ids: [],
  theme: 'light',
  push_enabled: false,
  email_enabled: false,
  push_subscription: null,
  updated_at: '',
}

export const MODULE_META: Record<ModuleKey, { label: string; href: string; desc: string }> = {
  memberWall: { label: '成员墙', href: '/', desc: '展示已加入的群成员' },
  materials: { label: '资料列表', href: '/', desc: '搜索 / 筛选 / 下载资料' },
  deadlines: { label: 'DDL 看板', href: '/deadlines', desc: '今天 / 本周 / 即将到期' },
  upload: { label: '上传入口', href: '/upload', desc: '快捷上传资料按钮' },
}