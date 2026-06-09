import { cn } from '@/lib/cn'

interface StatCardProps {
  label: string
  value: string
  sub?: string
  trend?: 'up' | 'down' | 'neutral'
  alert?: boolean
  variant?: 'success' | 'warn' | 'danger'
  className?: string
}

const VARIANT_STYLES = {
  success: { card: 'border-emerald-300 bg-emerald-50/30', value: 'text-emerald-800' },
  warn:    { card: 'border-amber-300 bg-amber-50/30',     value: 'text-amber-800'   },
  danger:  { card: 'border-red-300 bg-red-50/30',         value: 'text-red-800'     },
}

export function StatCard({ label, value, sub, trend, alert, variant, className }: StatCardProps) {
  const v = variant ?? (alert ? 'warn' : undefined)
  const vstyles = v ? VARIANT_STYLES[v] : null
  return (
    <div className={cn('bg-white border border-stone-200 rounded-lg px-5 py-4', vstyles?.card, className)}>
      <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">{label}</p>
      <p className={cn('text-2xl font-light text-stone-900', vstyles?.value)}>{value}</p>
      {sub && (
        <p className={cn(
          'text-xs mt-1',
          trend === 'up' && 'text-emerald-600',
          trend === 'down' && 'text-red-600',
          trend === 'neutral' && 'text-stone-500',
          !trend && 'text-stone-500',
        )}>
          {sub}
        </p>
      )}
    </div>
  )
}
