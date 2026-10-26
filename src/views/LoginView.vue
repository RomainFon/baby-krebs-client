<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const isSubmitting = ref(false)

// Retours d'échec du callback SSO Microsoft (MicrosoftAuthController côté API).
const SSO_ERRORS: Record<string, string> = {
  unauthorized:
    "Ce compte Microsoft n'est pas autorisé : seuls les organisateurs ont accès à l'admin.",
  microsoft: 'La connexion avec Microsoft a échoué. Réessaie.',
}

onMounted(() => {
  const code = route.query.error
  if (typeof code === 'string' && code in SSO_ERRORS) {
    error.value = SSO_ERRORS[code]!
    router.replace({ query: {} })
  }
})

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
    <div class="mb-8 w-full max-w-sm">
      <img src="/favicon.svg" alt="" class="mb-6 h-14 w-14" />
      <p class="kicker">Espace organisateur</p>
      <h1 class="display text-7xl">Connexion</h1>
    </div>

    <form class="card flex w-full max-w-sm flex-col gap-4 p-6" @submit.prevent="handleSubmit">
      <!-- Vraie navigation (pas un appel Axios) : le flux OAuth quitte le SPA
           pour passer par Microsoft. -->
      <a
        href="/api/auth/microsoft/redirect"
        class="btn w-full bg-paper py-3 text-ink hover:bg-white"
      >
        <svg viewBox="0 0 21 21" class="h-4 w-4" aria-hidden="true">
          <rect x="1" y="1" width="9" height="9" fill="#f25022" />
          <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
          <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
          <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
        </svg>
        Se connecter avec Microsoft
      </a>

      <div class="flex items-center gap-3 text-xs text-muted">
        <div class="h-px flex-1 bg-line" />
        ou avec un mot de passe
        <div class="h-px flex-1 bg-line" />
      </div>

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
      <button type="submit" :disabled="isSubmitting" class="btn-primary w-full py-3">
        {{ isSubmitting ? 'Connexion…' : 'Se connecter' }}
      </button>
    </form>

    <RouterLink :to="{ name: 'home' }" class="mt-6 text-sm text-muted hover:text-text">
      ← Retour à l'accueil
    </RouterLink>
  </div>
</template>
