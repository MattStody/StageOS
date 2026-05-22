import { cn } from '@/lib/cn'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

const variants = {
  primary: 'bg-stone-900 text-white hover:bg-stone-800',
  secondary: 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-50',
  ghost: 'text-stone-600 hover:bg-stone-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
}

export function Button({ variant = 'primary', size = 'md', className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center gap-1.5 rounded font-medium transition-colors cursor-pointer disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
