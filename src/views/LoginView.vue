<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const isSubmitting = ref(false)

async function handleSubmit() {
  error.value = null
  isSubmitting.value = true
  try {
    await auth.login(email.value, password.value)
    router.replace({ name: 'admin' })
  } catch {
    error.value = 'Email ou mot de passe incorrect.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center px-4">
    <div class="mb-8 text-center">
      <img src="/favicon.svg" alt="" class="mx-auto mb-3 h-12 w-12" />
      <h1 class="font-display text-4xl font-extrabold">
        Baby <span class="text-final">Krebs</span>
      </h1>
      <p class="mt-2 text-sm text-muted">Espace organisateur</p>
    </div>

    <form class="card flex w-full max-w-sm flex-col gap-4 p-6" @submit.prevent="handleSubmit">
      <label class="block text-sm">
        <span class="mb-1 block text-muted">Email</span>
        <input v-model="email" type="email" required autocomplete="username" class="field" />
      </label>
      <label class="block text-sm">
        <span class="mb-1 block text-muted">Mot de passe</span>
        <input
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
          class="field"
        />
      </label>
      <p v-if="error" class="text-sm text-danger">{{ error }}</p>
      <button type="submit" :disabled="isSubmitting" class="btn-primary w-full py-2.5">
        {{ isSubmitting ? 'Connexion…' : 'Se connecter' }}
      </button>
    </form>

    <RouterLink :to="{ name: 'home' }" class="mt-6 text-xs text-muted hover:text-text"
      >← Retour au tournoi</RouterLink
    >
  </div>
</template>
