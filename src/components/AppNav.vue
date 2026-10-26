<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const tabs = computed(() => {
  const name = String(route.name ?? '')
  const items = [
    { label: 'Accueil', to: { name: 'home' }, active: name === 'home' },
    { label: 'Tournois', to: { name: 'tournaments' }, active: route.path.startsWith('/tournois') },
    { label: 'Joueurs', to: { name: 'players' }, active: name.startsWith('player') },
  ]
  if (auth.user)
    items.push({ label: 'Admin', to: { name: 'admin' }, active: name.startsWith('admin') })
  return items
})

async function handleLogout() {
  await auth.logout()
  router.replace({ name: 'home' })
}
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-line bg-background/90 backdrop-blur">
    <div class="mx-auto flex max-w-6xl items-end gap-3 px-4 pt-3 sm:gap-8">
      <RouterLink
        :to="{ name: 'home' }"
        class="flex shrink-0 items-center gap-2 pb-3 font-display text-lg font-extrabold"
      >
        <img src="/favicon.svg" alt="" class="h-7 w-7" />
        <span class="hidden sm:inline">Baby <span class="text-final">Krebs</span></span>
      </RouterLink>

      <nav class="-mx-2 flex flex-1 items-end gap-0.5 overflow-x-auto text-sm sm:mx-0 sm:gap-1">
        <RouterLink
          v-for="tab in tabs"
          :key="tab.label"
          :to="tab.to"
          class="shrink-0 border-b-2 px-1.5 pb-3 sm:px-2"
          :class="
            tab.active
              ? 'border-primary font-semibold text-text'
              : 'border-transparent text-muted hover:text-text'
          "
        >
          {{ tab.label }}
        </RouterLink>
      </nav>

      <button
        v-if="auth.user"
        type="button"
        class="shrink-0 cursor-pointer pb-3 text-xs text-muted hover:text-text"
        @click="handleLogout"
      >
        Déconnexion
      </button>
      <RouterLink
        v-else
        :to="{ name: 'login' }"
        class="mb-2.5 shrink-0 rounded-md border border-line px-2.5 py-1 sm:px-3 text-xs text-muted hover:border-muted hover:text-text"
      >
        <span class="sm:hidden">Connexion</span><span class="hidden sm:inline">Se connecter</span>
      </RouterLink>
    </div>
  </header>
</template>
