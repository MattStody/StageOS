// Shared team roster — fake users for task assignment across StageOS
export interface StageUser {
  id: string
  name: string
  title: string
  initials: string
  color: string
}

export const STAGE_USERS: StageUser[] = [
  { id: 'user-1', name: 'Sarah Chen',    title: 'Production Manager',  initials: 'SC', color: '#6366f1' },
  { id: 'user-2', name: 'Marcus Webb',   title: 'Finance Director',    initials: 'MW', color: '#059669' },
  { id: 'user-3', name: 'Olivia Torres', title: 'Wardrobe Supervisor', initials: 'OT', color: '#d97706' },
]

// Default assignee by department — falls back to Sarah (PM) for anything unmapped
export function defaultAssigneeFor(department: string): string {
  const d = department.toLowerCase()
  if (d.includes('finance') || d.includes('box office')) return 'user-2'
  if (d.includes('wardrobe') || d.includes('costume')) return 'user-3'
  return 'user-1'
}

export const DEPT_COLORS: Record<string, string> = {
  Finance:            'text-emerald-700 bg-emerald-50 border-emerald-200',
  Wardrobe:           'text-violet-700 bg-violet-50 border-violet-200',
  Production:         'text-sky-700 bg-sky-50 border-sky-200',
  Admin:              'text-stone-700 bg-stone-100 border-stone-300',
  Marketing:          'text-pink-700 bg-pink-50 border-pink-200',
  Technical:          'text-amber-700 bg-amber-50 border-amber-200',
  'Stage Management': 'text-indigo-700 bg-indigo-50 border-indigo-200',
  'Front of House':   'text-teal-700 bg-teal-50 border-teal-200',
}

export function deptColor(department: string): string {
  return DEPT_COLORS[department] ?? 'text-stone-600 bg-stone-50 border-stone-200'
}
