// Onboarding checklist generation — Canadian theatre payroll/legal context.
// When a contract is signed, this produces the standard checklist for a person
// based on their role and whether they are out-of-town.

import type { OnboardingItem, OnboardingChecklist, Person, PersonRoleType } from './types'

interface ItemSpec {
  label: string
  category: OnboardingItem['category']
  required: boolean
  defaultAssignee: string
  // dueOffsetDays from checklist creation
  dueOffsetDays: number
  // only include when condition holds
  when?: (ctx: { roleType: PersonRoleType; outOfTown: boolean; isCastOrWardrobe: boolean }) => boolean
}

const ITEM_SPECS: ItemSpec[] = [
  { label: 'SIN (Social Insurance Number) collected for payroll', category: 'Finance', required: true, defaultAssignee: 'Finance', dueOffsetDays: 5 },
  { label: 'TD1 Federal tax form completed', category: 'Finance', required: true, defaultAssignee: 'Finance', dueOffsetDays: 7 },
  { label: 'TD1 Provincial tax form completed', category: 'Finance', required: true, defaultAssignee: 'Finance', dueOffsetDays: 7 },
  { label: 'Direct deposit / EFT banking information collected', category: 'Finance', required: true, defaultAssignee: 'Finance', dueOffsetDays: 5 },
  { label: 'Emergency contact on file', category: 'Legal', required: true, defaultAssignee: 'Company Manager', dueOffsetDays: 7 },
  { label: 'Union status confirmed and member number recorded', category: 'Legal', required: true, defaultAssignee: 'Company Manager', dueOffsetDays: 7 },
  { label: 'Agent / representative contact saved to profile', category: 'Legal', required: false, defaultAssignee: 'Company Manager', dueOffsetDays: 10 },
  { label: 'WSIB / WCB coverage confirmed (verify province-specific)', category: 'Legal', required: true, defaultAssignee: 'Finance', dueOffsetDays: 7 },
  { label: 'Housing assigned', category: 'Housing', required: true, defaultAssignee: 'Company Manager', dueOffsetDays: 14, when: (c) => c.outOfTown },
  { label: 'Travel booked', category: 'Travel', required: true, defaultAssignee: 'Company Manager', dueOffsetDays: 14, when: (c) => c.outOfTown },
  { label: 'Measurements collected', category: 'Production', required: true, defaultAssignee: 'Wardrobe', dueOffsetDays: 10, when: (c) => c.isCastOrWardrobe },
  { label: 'Dietary / accessibility needs noted', category: 'Production', required: false, defaultAssignee: 'Company Manager', dueOffsetDays: 10 },
  { label: 'Added to production calendar invites', category: 'Production', required: true, defaultAssignee: 'GM', dueOffsetDays: 5 },
  { label: 'Added to company communication channels', category: 'Communication', required: true, defaultAssignee: 'Company Manager', dueOffsetDays: 5 },
  { label: 'Script / materials sent', category: 'Communication', required: true, defaultAssignee: 'GM', dueOffsetDays: 3 },
]

function addDays(iso: string, days: number): string {
  const d = new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''))
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const OUT_OF_TOWN_CITIES = new Set(['Montreal', 'Vancouver', 'Winnipeg', 'Halifax', 'Calgary', 'Edmonton', 'Ottawa'])

export function isOutOfTown(person: Person): boolean {
  // Company is Toronto-based; anyone not in the GTA is out of town.
  if (!person.city) return false
  const gta = new Set(['Toronto', 'Mississauga', 'Brampton', 'Markham', 'Scarborough', 'Etobicoke', 'North York'])
  return !gta.has(person.city) || OUT_OF_TOWN_CITIES.has(person.city)
}

/**
 * Build a fresh onboarding checklist for a person joining a production.
 * `startDateISO` anchors the due dates (defaults to today).
 */
export function generateOnboardingChecklist(
  person: Person,
  productionId: string,
  contractId: string,
  createdAtISO: string = new Date().toISOString(),
): OnboardingChecklist {
  const baseDate = createdAtISO.slice(0, 10)
  const outOfTown = isOutOfTown(person)
  const isCastOrWardrobe = person.roleType === 'Principal' || person.roleType === 'Ensemble'
  const ctx = { roleType: person.roleType, outOfTown, isCastOrWardrobe }

  const items: OnboardingItem[] = ITEM_SPECS
    .filter((spec) => !spec.when || spec.when(ctx))
    .map((spec, i) => ({
      id: `onb-item-${contractId}-${i}`,
      label: spec.label,
      assignedTo: spec.defaultAssignee,
      dueDate: addDays(baseDate, spec.dueOffsetDays),
      required: spec.required,
      category: spec.category,
    }))

  return {
    id: `onb-${contractId}`,
    personId: person.id,
    productionId,
    contractId,
    items,
    createdAt: createdAtISO,
  }
}

export function checklistProgress(checklist: OnboardingChecklist): { done: number; total: number; pct: number } {
  const total = checklist.items.length
  const done = checklist.items.filter((i) => i.completedAt).length
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) }
}

export const ONBOARDING_CATEGORY_COLORS: Record<OnboardingItem['category'], string> = {
  Legal: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  Finance: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  Housing: 'text-amber-700 bg-amber-50 border-amber-200',
  Travel: 'text-sky-700 bg-sky-50 border-sky-200',
  Production: 'text-violet-700 bg-violet-50 border-violet-200',
  Communication: 'text-rose-700 bg-rose-50 border-rose-200',
}
