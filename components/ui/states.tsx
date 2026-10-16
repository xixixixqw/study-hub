import * as React from 'react'
import { cn } from '@/lib/utils'

const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('animate-pulse rounded-xl bg-slate-200/70', className)} {...props} />
)

/** 加载态：骨架卡片列表 */
export function CardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/** 空状态 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
      <div className="mb-3 text-4xl opacity-60">{icon || '📭'}</div>
      <div className="text-base font-medium text-foreground">{title}</div>
      {description && (
        <div className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</div>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/** 错误提示 */
export function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/60 px-6 py-10 text-center">
      <div className="mb-2 text-3xl">⚠️</div>
      <div className="text-sm font-medium text-red-800">{message}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
        >
          重试
        </button>
      )}
    </div>
  )
}

/** 内联错误条 */
export function InlineError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  )
}

/** 分区标题 */
export function SectionTitle({
  title,
  count,
  action,
  icon,
}: {
  title: string
  count?: number
  action?: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
        {icon}
        {title}
        {typeof count === 'number' && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-600">
            {count}
          </span>
        )}
      </h2>
      {action}
    </div>
  )
}