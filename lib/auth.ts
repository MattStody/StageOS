export const ADMIN_EMAIL = 'matt@boldlymedia.com'
export const ADMIN_PASSWORD = 'StageOps2026!'
export const ADMIN_SESSION_KEY = 'stageops-admin'

export function checkAdminCredentials(email: string, password: string): boolean {
  return email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD
}
