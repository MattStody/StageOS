export function fmt(n: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

export function fmtNum(n: number): string {
  return new Intl.NumberFormat('en-US').format(n)
}

export function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`
}

export function variance(actual: number, budgeted: number): number {
  return actual - budgeted
}

export function variancePct(actual: number, budgeted: number): number {
  if (budgeted === 0) return 0
  return ((actual - budgeted) / budgeted) * 100
}

export function budgetUsedPct(actual: number, budgeted: number): number {
  if (budgeted === 0) return 0
  return (actual / budgeted) * 100
}

export function isOverdue(dateStr: string): boolean {
  return new Date(dateStr) < new Date()
}

export function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: 'Draft',
    sent: 'Sent',
    signed: 'Signed',
    expired: 'Expired',
    needs_review: 'Needs Review',
    pre_production: 'Pre-Production',
    in_rehearsal: 'In Rehearsal',
    in_performance: 'In Performance',
    closing: 'Closing',
    closed: 'Closed',
    upcoming: 'Upcoming',
    completed: 'Completed',
    overdue: 'Overdue',
    at_risk: 'At Risk',
  }
  return map[status] || status
}
