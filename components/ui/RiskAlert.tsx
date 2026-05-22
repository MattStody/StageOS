import { AlertTriangle } from 'lucide-react'

export function RiskAlert({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
      <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-500" />
      <span>{message}</span>
    </div>
  )
}
