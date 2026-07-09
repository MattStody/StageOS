export const ADMIN_EMAIL = 'matt@boldlymedia.com'
export const ADMIN_PASSWORD = 'StageOps2026!'
export const ADMIN_SESSION_KEY = 'stageops-admin'
export const USER_SESSION_KEY = 'stageops-user-id'

export type SectionId = 'dashboard' | 'production' | 'company' | 'finance' | 'workspace'

export interface AppUser {
  id: string
  name: string
  title: string
  email: string
  sections: SectionId[]
  defaultHref: string
  isAdmin?: boolean
  /** User gets their own data partition that starts with no seed data */
  freshWorkspace?: boolean
}

export const ROLE_USERS: AppUser[] = [
  {
    id: 'company',
    name: 'Diane Pelletier',
    title: 'Company Manager',
    email: 'diane@adamblanshay.com',
    sections: ['dashboard', 'company'],
    defaultHref: '/company/roster',
  },
  {
    id: 'production',
    name: 'Jordan Reeves',
    title: 'Production Manager',
    email: 'jordan@adamblanshay.com',
    sections: ['dashboard', 'production'],
    defaultHref: '/productions',
  },
  {
    id: 'finance',
    name: 'Nina Okafor',
    title: 'Finance Director',
    email: 'nina@adamblanshay.com',
    sections: ['dashboard', 'finance'],
    defaultHref: '/budget',
  },
  {
    id: 'danielle',
    name: 'Danielle',
    title: 'Empty Workspace',
    email: 'danielle@stageos-test.com',
    sections: ['dashboard', 'production', 'company', 'finance', 'workspace'],
    defaultHref: '/dashboard',
    freshWorkspace: true,
  },
]

export const ADMIN_USER: AppUser = {
  id: 'admin',
  name: 'Leon Kay',
  title: 'General Manager',
  email: ADMIN_EMAIL,
  sections: ['dashboard', 'production', 'company', 'finance', 'workspace'],
  defaultHref: '/dashboard',
  isAdmin: true,
}

export function checkAdminCredentials(email: string, password: string): boolean {
  return email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD
}

export function findRoleUser(id: string): AppUser | undefined {
  return ROLE_USERS.find((u) => u.id === id)
}
