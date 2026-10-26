<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useTournamentStore } from '@/stores/tournament'
import { useAuthStore } from '@/stores/auth'
import { STATUS_LABELS } from '@/lib/tournament'

const props = defineProps<{ tournamentId: number }>()
const store = useTournamentStore()
const auth = useAuthStore()
const route = useRoute()

watch(
  () => props.tournamentId,
  (id) => {
    if (store.current?.id !== id) store.load(id)
  },
  { immediate: true },
)

// Rafraîchit en tâche de fond pour suivre les scores le jour J sans recharger.
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => {
    if (document.visibilityState === 'visible') store.load(props.tournamentId, { silent: true })
  }, 30_000)
})
onUnmounted(() => clearInterval(timer))

const tournament = computed(() => (store.current?.id === props.tournamentId ? store.current : null))

const subTabs = computed(() => [
  { label: 'Tableau', name: 'bracket', active: route.name === 'bracket' },
  { label: 'Matchs', name: 'games', active: route.name === 'games' },
  { label: 'Équipes', name: 'teams', active: route.name === 'teams' || route.name === 'team' },
])
</script>

<template>
  <main class="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
    <p v-if="store.error" class="text-sm text-danger">{{ store.error }}</p>
    <p v-else-if="!tournament" class="text-sm text-muted">Chargement…</p>
    <template v-else>
      <div class="flex flex-col gap-3">
        <RouterLink :to="{ name: 'tournaments' }" class="text-sm text-muted hover:text-text">
          ← Tous les tournois
        </RouterLink>
        <header class="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 class="font-display text-2xl font-extrabold sm:text-3xl">{{ tournament.name }}</h1>
          <span class="rounded-full border border-line px-2 py-0.5 text-xs text-muted">
            {{ STATUS_LABELS[tournament.status] }}
          </span>
          <RouterLink
            v-if="auth.user"
            :to="{ name: 'admin-tournament', params: { tournamentId: tournament.id } }"
            class="ml-auto text-xs text-muted hover:text-text"
          >
            Gérer ✎
          </RouterLink>
        </header>
        <nav class="flex gap-1 rounded-lg border border-line bg-surface p-1 text-sm sm:w-fit">
          <RouterLink
            v-for="tab in subTabs"
            :key="tab.name"
            :to="{ name: tab.name, params: { tournamentId: tournament.id } }"
            class="flex-1 rounded-md px-4 py-1.5 text-center sm:flex-none"
            :class="
              tab.active ? 'bg-surface-alt font-semibold text-text' : 'text-muted hover:text-text'
            "
          >
            {{ tab.label }}
          </RouterLink>
        </nav>
      </div>
      <RouterView :tournament="tournament" />
    </template>
  </main>
</template>
