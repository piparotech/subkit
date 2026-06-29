import { PUIButton, PUIText, PUITag, cn } from '@piparo/cn-web'
import { ChevronRight } from 'lucide-react'
import * as React from 'react'

import type { AppTenant, StatusTone } from './types'

const toneText: Record<StatusTone, string> = {
  success: 'text-[var(--subs-green)]',
  warning: 'text-[var(--subs-amber)]',
  muted: 'text-[var(--subs-faint)]',
  destructive: 'text-[var(--subs-red)]',
}

const toneBg: Record<StatusTone, string> = {
  success: 'bg-[var(--subs-green)]',
  warning: 'bg-[var(--subs-amber)]',
  muted: 'bg-[var(--subs-faint)]',
  destructive: 'bg-[var(--subs-red)]',
}

const tagIntent: Record<StatusTone, 'neutral' | 'success' | 'warning' | 'destructive'> = {
  success: 'success',
  warning: 'warning',
  muted: 'neutral',
  destructive: 'destructive',
}

export function toneTextClass(tone: StatusTone): string {
  return toneText[tone]
}

export function toneBgClass(tone: StatusTone): string {
  return toneBg[tone]
}

export function ToneDot({ tone, className }: { tone: StatusTone; className?: string }) {
  return <span aria-hidden className={cn('size-[7px] rounded-full', toneBg[tone], className)} />
}

export function StatusLabel({ label, tone }: { label: string; tone: StatusTone }) {
  return (
    <span className={cn('inline-flex items-center gap-[6px] text-[12px] font-semibold', toneText[tone])}>
      <ToneDot tone={tone} />
      {label}
    </span>
  )
}

export function SoftTag({ children, tone = 'muted' }: { children: React.ReactNode; tone?: StatusTone }) {
  return (
    <PUITag
      className="border border-[var(--subs-border)] font-mono"
      emphasis="soft"
      intent={tagIntent[tone]}
      label={children}
      size="sm"
    />
  )
}

export function AppAvatar({ app, size = 'md' }: { app: AppTenant; size?: 'xs' | 'sm' | 'md' | 'lg' }) {
  const sizeClass = {
    xs: 'size-[14px] rounded-[4px] text-[8px]',
    sm: 'size-[24px] rounded-[6px] text-[10.5px]',
    md: 'size-[44px] rounded-[11px] text-[16px]',
    lg: 'size-[46px] rounded-[12px] text-[17px]',
  }
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center font-bold text-white', sizeClass[size])}
      style={{ background: app.color }}
    >
      {app.initials}
    </span>
  )
}

export function MiniAppAvatar({ initials, color }: { initials: string; color: string }) {
  return (
    <span
      className="inline-flex size-[30px] shrink-0 items-center justify-center rounded-[8px] text-[13px] font-bold text-white"
      style={{ background: color }}
    >
      {initials}
    </span>
  )
}

export function ViewTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-[6px]">
      <PUIText as="h1" className="m-0 tracking-[-0.01em] text-[22px] font-bold" variant="title2">
        {title}
      </PUIText>
      <p className="mt-[5px] mb-0 text-[13.5px] text-[var(--subs-dim)]">{description}</p>
    </div>
  )
}

export function MetricCard({ label, value, delta, tone }: { label: string; value: string; delta?: string; tone?: StatusTone }) {
  return (
    <div className="rounded-[12px] border border-[var(--subs-border)] bg-[var(--subs-panel)] px-[18px] py-[16px]">
      <div className="text-[12.5px] text-[var(--subs-dim)]">{label}</div>
      <div className="mt-[7px] flex items-baseline gap-[9px]">
        <div className="font-mono text-[23px] font-bold">{value}</div>
        {delta != null && tone != null ? <div className={cn('text-[12.5px] font-semibold', toneText[tone])}>{delta}</div> : null}
      </div>
    </div>
  )
}

export function RowChevron() {
  return <ChevronRight aria-hidden className="size-[18px] text-[var(--subs-faint)]" strokeWidth={1.6} />
}

export function HeaderButton({ children, onPress }: { children: React.ReactNode; onPress: () => void }) {
  return (
    <PUIButton
      className="min-h-[38px] rounded-[9px] px-[14px] py-[9px] text-[13px] shadow-sm"
      label={children}
      onPress={onPress}
      size="sm"
    />
  )
}

export function GhostBox({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-[11px] border border-[var(--subs-border)] p-[13px]', className)}>
      {children}
    </div>
  )
}
