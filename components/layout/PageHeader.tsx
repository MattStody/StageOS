import { cn } from '@/lib/cn'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between mb-8', className)}>
      <div>
        <h1 className="text-2xl font-light text-stone-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-stone-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 mt-1">{actions}</div>}
    </div>
  )
}
