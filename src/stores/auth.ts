import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchCurrentUser, fetchSession, login as apiLogin, logout as apiLogout } from '@/api/auth'
import type { User } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isChecking = ref(true)

  async function checkSession() {
    isChecking.value = true
    try {
      user.value = await fetchSession()
    } catch {
      user.value = null
    } finally {
      isChecking.value = false
    }
  }

  async function login(email: string, password: string) {
    await apiLogin(email, password)
    user.value = await fetchCurrentUser()
  }

  async function logout() {
    await apiLogout()
    user.value = null
  }

  return { user, isChecking, checkSession, login, logout }
})
