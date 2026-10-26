<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { TournamentSummary } from '@/types'
import { formatDate, STATUS_LABELS } from '@/lib/tournament'
import { plural } from '@/lib/format'

// Carte d'un tournoi, en version "à la une" (en cours, avec progression)
// ou compacte (listes à venir / déjà joués).
const props = defineProps<{ tournament: TournamentSummary; featured?: boolean }>()

const progress = computed(() =>
  props.tournament.games_total
    ? Math.round((props.tournament.games_played / props.tournament.games_total) * 100)
    : 0,
)
</script>

<template>
  <!-- À la une : bloc lime, comme la carte de match de la maquette. -->
  <RouterLink
    v-if="featured"
    :to="{ name: 'bracket', params: { tournamentId: tournament.id } }"
    class="group flex flex-col gap-6 rounded-3xl bg-surface p-6 ring-1 ring-line transition-transform hover:-translate-y-0.5 sm:p-8"
  >
    <div class="flex items-center justify-between gap-3">
      <span class="live-badge"
        ><span class="h-2 w-2 animate-pulse rounded-full bg-live" /> Live</span
      >
      <span class="text-sm font-semibold text-primary"
        >{{ STATUS_LABELS[tournament.status] }} →</span
      >
    </div>
    <h3 class="display text-4xl sm:text-6xl">{{ tournament.name }}</h3>
    <div class="flex flex-col gap-2">
      <div class="h-2.5 overflow-hidden rounded-full bg-surface-alt">
        <div class="h-full rounded-full bg-primary" :style="{ width: `${progress}%` }" />
      </div>
      <p class="text-sm text-muted">
        {{ tournament.games_played }} /
        {{ plural(tournament.games_total, 'match', 'matchs') }} joués ·
        {{ tournament.teams_count }} équipes
      </p>
    </div>
  </RouterLink>

  <RouterLink
    v-else
    :to="{
      name: tournament.status === 'draft' ? 'teams' : 'bracket',
      params: { tournamentId: tournament.id },
    }"
    class="flex items-center justify-between gap-4 rounded-3xl bg-surface px-5 py-4 transition-colors hover:bg-surface-alt"
  >
    <div class="min-w-0">
      <p class="display truncate text-2xl">{{ tournament.name }}</p>
      <p v-if="tournament.champion" class="truncate text-sm text-muted">
        🏆 <span class="font-semibold text-primary">{{ tournament.champion.name }}</span> ·
        {{ tournament.champion.players.join(' & ') }}
      </p>
      <p v-else class="text-sm text-muted">
        {{ plural(tournament.teams_count, 'équipe inscrite', 'équipes inscrites') }}
      </p>
    </div>
    <span class="shrink-0 rounded-full bg-surface-alt px-3 py-1 text-xs font-medium text-muted">
      {{
        tournament.status === 'draft'
          ? tournament.starts_at
            ? formatDate(tournament.starts_at)
            : 'Inscriptions'
          : `${tournament.teams_count} équipes`
      }}
    </span>
  </RouterLink>
</template>
