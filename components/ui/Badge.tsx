import { cn } from '@/lib/cn'

type Variant = 'signed' | 'sent' | 'draft' | 'expired' | 'needs_review' |
  'pre_production' | 'in_rehearsal' | 'in_performance' | 'closing' | 'closed' |
  'upcoming' | 'completed' | 'overdue' | 'at_risk' | 'warning' | 'success' | 'neutral'

const styles: Record<Variant, string> = {
  signed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  sent: 'bg-sky-50 text-sky-700 border-sky-200',
  draft: 'bg-stone-100 text-stone-600 border-stone-200',
  expired: 'bg-red-50 text-red-700 border-red-200',
  needs_review: 'bg-amber-50 text-amber-700 border-amber-200',
  pre_production: 'bg-violet-50 text-violet-700 border-violet-200',
  in_rehearsal: 'bg-sky-50 text-sky-700 border-sky-200',
  in_performance: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  closing: 'bg-amber-50 text-amber-700 border-amber-200',
  closed: 'bg-stone-100 text-stone-600 border-stone-200',
  upcoming: 'bg-stone-100 text-stone-600 border-stone-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  overdue: 'bg-red-50 text-red-700 border-red-200',
  at_risk: 'bg-amber-50 text-amber-700 border-amber-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  neutral: 'bg-stone-100 text-stone-600 border-stone-200',
}

interface BadgeProps {
  variant: Variant | string
  children: React.ReactNode
  className?: string
}

export function Badge({ variant, children, className }: BadgeProps) {
  const style = styles[variant as Variant] || styles.neutral
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border tracking-wide', style, className)}>
      {children}
    </span>
  )
}
