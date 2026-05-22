import { cn } from '@/lib/cn'

interface StatCardProps {
  label: string
  value: string
  sub?: string
  trend?: 'up' | 'down' | 'neutral'
  alert?: boolean
  className?: string
}

export function StatCard({ label, value, sub, trend, alert, className }: StatCardProps) {
  return (
    <div className={cn('bg-white border border-stone-200 rounded-lg px-5 py-4', alert && 'border-amber-300 bg-amber-50/30', className)}>
      <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">{label}</p>
      <p className={cn('text-2xl font-light text-stone-900', alert && 'text-amber-800')}>{value}</p>
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
