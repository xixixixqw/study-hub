'use client'

/** 环境探测：QQ / 微信内置浏览器、PWA 安装能力、通知权限 */
export interface EnvInfo {
  isWeixin: boolean
  isQQ: boolean
  isInAppBrowser: boolean
  isStandalone: boolean
  canInstall: boolean
  hasNotification: boolean
  safari: boolean
}

export function detectEnv(): EnvInfo {
  if (typeof window === 'undefined') {
    return {
      isWeixin: false, isQQ: false, isInAppBrowser: false,
      isStandalone: true, canInstall: false, hasNotification: false, safari: false,
    }
  }
  const ua = window.navigator.userAgent.toLowerCase()
  const isWeixin = /micromessenger/.test(ua)
  const isQQ = /\bqq\//.test(ua) || /mqqbrowser/.test(ua)
  const isInAppBrowser = isWeixin || isQQ
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  const hasNotification = typeof window !== 'undefined' && 'Notification' in window
  const safari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua)
  return {
    isWeixin, isQQ, isInAppBrowser, isStandalone,
    canInstall: false,
    hasNotification,
    safari,
  }
}

export function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => fallbackCopy(text))
  }
  return Promise.resolve(fallbackCopy(text))
}

function fallbackCopy(text: string): boolean {
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission
  }
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

/** 站内本地提醒（未授权系统通知时的降级） */
export function localNotify(title: string, body: string): void {
  try {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/icons/icon-192.png', tag: 'study-hub-ddl' })
    }
  } catch {
    /* 忽略 */
  }
}

let swReg: ServiceWorkerRegistration | null = null
let deferredPrompt: BeforeInstallPromptEvent | null = null

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function onInstallPrompt(cb: (e: BeforeInstallPromptEvent) => void): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    cb(deferredPrompt)
  })
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable'
  await deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null
  return outcome
}

export function getDeferredPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt
}

/** 注册 Service Worker */
export async function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    swReg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    return swReg
  } catch {
    return null
  }
}

export function getSW(): ServiceWorkerRegistration | null {
  return swReg
}