<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useTournamentStore } from '@/stores/tournament'
import { useAuthStore } from '@/stores/auth'
import { STATUS_LABELS } from '@/lib/tournament'
import AppIcon from '@/components/ui/AppIcon.vue'
import PageTitle from '@/components/ui/PageTitle.vue'

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

const isLive = computed(
  () => tournament.value?.status === 'groups' || tournament.value?.status === 'bracket',
)

const subTabs = computed(() => [
  { label: 'Tableau', name: 'bracket', active: route.name === 'bracket' },
  { label: 'Matchs', name: 'games', active: route.name === 'games' },
  { label: 'Équipes', name: 'teams', active: route.name === 'teams' || route.name === 'team' },
  { label: 'Règlement', name: 'rules', active: route.name === 'rules' },
])
</script>

<template>
  <main class="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6">
    <p v-if="store.error" class="text-sm text-danger">{{ store.error }}</p>
    <p v-else-if="!tournament" class="text-sm text-muted">Chargement…</p>
    <template v-else>
      <div class="flex flex-col gap-6">
        <div class="flex items-center justify-between gap-3">
          <RouterLink
            :to="{ name: 'tournaments' }"
            class="flex h-11 w-11 items-center justify-center rounded-full bg-surface-alt text-muted hover:text-text"
            aria-label="Tous les tournois"
          >
            <AppIcon name="arrow-left" class="h-5 w-5" />
          </RouterLink>
          <div class="flex items-center gap-2">
            <span v-if="isLive" class="live-badge">
              <span class="h-2 w-2 animate-pulse rounded-full bg-live" /> Live
            </span>
            <span
              v-else
              class="rounded-full bg-surface-alt px-3 py-1 text-xs font-medium text-muted"
            >
              {{ STATUS_LABELS[tournament.status] }}
            </span>
            <RouterLink
              v-if="auth.user"
              :to="{ name: 'admin-tournament', params: { tournamentId: tournament.id } }"
              class="rounded-full bg-surface-alt px-3 py-1 text-xs font-medium text-muted hover:text-text"
            >
              Gérer ✎
            </RouterLink>
          </div>
        </div>

        <PageTitle
          :kicker="isLive ? `Tournoi · ${STATUS_LABELS[tournament.status]}` : 'Tournoi'"
          :title="tournament.name"
          size="lg"
        />

        <nav class="flex gap-1.5 overflow-x-auto rounded-full bg-surface p-1.5 sm:w-fit">
          <RouterLink
            v-for="tab in subTabs"
            :key="tab.name"
            :to="{ name: tab.name, params: { tournamentId: tournament.id } }"
            class="pill flex-1 sm:flex-none sm:px-6"
            :class="tab.active && 'pill-active'"
          >
            {{ tab.label }}
          </RouterLink>
        </nav>
      </div>
      <RouterView :tournament="tournament" />
    </template>
  </main>
</template>
