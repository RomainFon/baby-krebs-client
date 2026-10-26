import { ensureCsrfCookie, http } from './client'
import type { User } from '@/types'

export async function login(email: string, password: string): Promise<void> {
  await ensureCsrfCookie()
  await http.post('/api/login', { email, password })
}

export async function logout(): Promise<void> {
  await http.post('/api/logout')
}

// Répond toujours 200 (data: null pour un visiteur) : appelée au démarrage
// sans générer d'erreur 401 dans la console.
export async function fetchSession(): Promise<User | null> {
  const { data } = await http.get<{ data: User | null }>('/api/session')
  return data.data
}

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await http.get<{ data: User }>('/api/user')
  return data.data
}
