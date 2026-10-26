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
  <RouterLink
    v-if="featured"
    :to="{ name: 'bracket', params: { tournamentId: tournament.id } }"
    class="card flex flex-col gap-4 p-5 transition-colors hover:bg-surface-alt sm:p-6"
    style="
      background:
        radial-gradient(
          120% 120% at 0% 0%,
          color-mix(in srgb, var(--color-primary) 14%, transparent),
          transparent 60%
        ),
        var(--color-surface);
    "
  >
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <h3 class="font-display text-2xl font-extrabold">{{ tournament.name }}</h3>
      <span class="text-sm text-primary">{{ STATUS_LABELS[tournament.status] }} →</span>
    </div>
    <div class="flex flex-col gap-1.5">
      <div class="h-2 overflow-hidden rounded-full bg-background">
        <div class="h-full rounded-full bg-primary" :style="{ width: `${progress}%` }" />
      </div>
      <p class="text-xs text-muted">
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
    class="card flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-alt"
  >
    <div class="min-w-0">
      <p class="truncate font-semibold">{{ tournament.name }}</p>
      <p v-if="tournament.champion" class="truncate text-xs text-muted">
        🏆 <span class="text-final">{{ tournament.champion.name }}</span> ·
        {{ tournament.champion.players.join(' & ') }}
      </p>
      <p v-else class="text-xs text-muted">
        {{ plural(tournament.teams_count, 'équipe inscrite', 'équipes inscrites') }}
      </p>
    </div>
    <span class="shrink-0 text-xs text-muted">
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
