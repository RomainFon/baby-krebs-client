<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppIcon from '@/components/ui/AppIcon.vue'
import BrandName from '@/components/ui/BrandName.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

type Tab = {
  label: string
  icon: 'home' | 'trophy' | 'users' | 'settings'
  to: { name: string }
  active: boolean
}

const tabs = computed<Tab[]>(() => {
  const name = String(route.name ?? '')
  const items: Tab[] = [
    { label: 'Accueil', icon: 'home', to: { name: 'home' }, active: name === 'home' },
    {
      label: 'Tournois',
      icon: 'trophy',
      to: { name: 'tournaments' },
      active: route.path.startsWith('/tournois'),
    },
    { label: 'Joueurs', icon: 'users', to: { name: 'players' }, active: name.startsWith('player') },
  ]
  if (auth.user) {
    items.push({
      label: 'Admin',
      icon: 'settings',
      to: { name: 'admin' },
      active: name.startsWith('admin'),
    })
  }
  return items
})

async function handleLogout() {
  await auth.logout()
  router.replace({ name: 'home' })
}
</script>

<template>
  <header class="sticky top-0 z-30 bg-background/85 backdrop-blur-md">
    <div class="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:gap-8">
      <RouterLink :to="{ name: 'home' }" class="flex shrink-0 items-center gap-2.5">
        <img src="/favicon.svg" alt="" class="h-10 w-10" />
        <BrandName class="font-display text-xl tracking-wide uppercase" />
      </RouterLink>

      <!-- Desktop : onglets en pilules dans l'en-tête. -->
      <nav class="hidden flex-1 items-center gap-2 md:flex">
        <RouterLink
          v-for="tab in tabs"
          :key="tab.label"
          :to="tab.to"
          class="pill"
          :class="tab.active && 'pill-active'"
        >
          {{ tab.label }}
        </RouterLink>
      </nav>

      <button
        v-if="auth.user"
        type="button"
        class="ml-auto flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface-alt text-muted hover:text-text md:ml-0"
        title="Se déconnecter"
        aria-label="Se déconnecter"
        @click="handleLogout"
      >
        <AppIcon name="logout" class="h-5 w-5" />
      </button>
      <RouterLink v-else :to="{ name: 'login' }" class="btn-ghost ml-auto md:ml-0">
        <AppIcon name="login" class="h-4 w-4" />
        Se connecter
      </RouterLink>
    </div>
  </header>

  <!-- Mobile : barre d'onglets flottante en bas, comme la maquette. -->
  <nav
    class="fixed inset-x-0 bottom-4 z-30 mx-auto flex w-fit items-center gap-1.5 rounded-full bg-surface/95 p-1.5 shadow-2xl shadow-black/60 ring-1 ring-line backdrop-blur-md md:hidden"
    style="margin-bottom: env(safe-area-inset-bottom)"
  >
    <RouterLink
      v-for="tab in tabs"
      :key="tab.label"
      :to="tab.to"
      :aria-label="tab.label"
      class="flex h-12 items-center justify-center gap-2 rounded-full transition-all"
      :class="tab.active ? 'bg-primary px-5 text-primary-text' : 'w-12 bg-surface-alt text-muted'"
    >
      <AppIcon :name="tab.icon" class="h-5 w-5" />
      <span v-if="tab.active" class="text-sm font-semibold">{{ tab.label }}</span>
    </RouterLink>
  </nav>
</template>
