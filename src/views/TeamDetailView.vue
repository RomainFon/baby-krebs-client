<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import type { Game, TournamentDetail } from '@/types'
import {
  formatDate,
  gameTitle,
  isPlayed,
  slotLabel,
  STAGE_ACCENT,
  teamById,
  teamGames,
  teamStats,
  teamStatus,
} from '@/lib/tournament'
import GameModal from '@/components/GameModal.vue'

const props = defineProps<{ tournament: TournamentDetail; teamId: number }>()

const team = computed(() => teamById(props.tournament, props.teamId))
const stats = computed(() => teamStats(props.tournament, props.teamId))
const status = computed(() => teamStatus(props.tournament, props.teamId))
const statItems = computed(() => [
  { label: 'Joués', value: stats.value.played, cls: '' },
  { label: 'Victoires', value: stats.value.wins, cls: 'text-winner' },
  { label: 'Défaites', value: stats.value.losses, cls: 'text-loser' },
  { label: 'Buts pour', value: stats.value.goals_for, cls: '' },
  { label: 'Buts contre', value: stats.value.goals_against, cls: '' },
  {
    label: 'Différence',
    value: (stats.value.goal_diff > 0 ? '+' : '') + stats.value.goal_diff,
    cls: '',
  },
])
const games = computed(() =>
  teamGames(props.tournament, props.teamId).sort((a, b) => a.number - b.number),
)
const played = computed(() => games.value.filter(isPlayed).reverse())
const upcoming = computed(() => games.value.filter((g) => !isPlayed(g)))

const openedGameId = ref<number | null>(null)
const openedGame = computed(
  () => props.tournament.games.find((g) => g.id === openedGameId.value) ?? null,
)

function opponent(game: Game): string {
  return slotLabel(props.tournament, game, game.team_a_id === props.teamId ? 'b' : 'a')
}

function result(game: Game) {
  const isA = game.team_a_id === props.teamId
  const own = isA ? game.score_a! : game.score_b!
  const other = isA ? game.score_b! : game.score_a!
  return { own, other, won: own > other }
}
</script>

<template>
  <div v-if="team" class="flex flex-col gap-6">
    <RouterLink
      :to="{ name: 'teams', params: { tournamentId: tournament.id } }"
      class="text-sm text-muted hover:text-text"
    >
      ← Toutes les équipes
    </RouterLink>

    <section class="card flex flex-col gap-4 p-5">
      <div>
        <h2 class="font-display text-2xl font-extrabold">{{ team.name }}</h2>
        <p class="text-muted">
          <template v-for="(p, i) in team.players" :key="p.id">
            <span v-if="i > 0"> & </span>
            <RouterLink
              :to="{ name: 'player', params: { playerId: p.id } }"
              class="hover:text-text hover:underline"
            >
              {{ p.name }}
            </RouterLink>
          </template>
        </p>
        <p class="mt-1 text-sm">{{ status }}</p>
      </div>
      <dl class="grid grid-cols-3 gap-3 text-center sm:grid-cols-6">
        <div v-for="item in statItems" :key="item.label" class="rounded-lg bg-background/50 py-2">
          <dt class="text-[11px] text-muted">{{ item.label }}</dt>
          <dd class="font-display text-xl font-extrabold tabular-nums" :class="item.cls">
            {{ item.value }}
          </dd>
        </div>
      </dl>
    </section>

    <section class="flex flex-col gap-2">
      <h3 class="text-sm font-semibold tracking-wide text-muted uppercase">Prochains matchs</h3>
      <p v-if="upcoming.length === 0" class="text-sm text-muted">Aucun match à venir.</p>
      <button
        v-for="game in upcoming"
        :key="game.id"
        type="button"
        class="card flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-alt"
        :style="{ borderLeft: `3px solid ${STAGE_ACCENT[game.stage]}` }"
        @click="openedGameId = game.id"
      >
        <div class="min-w-0">
          <p class="text-xs text-muted">M{{ game.number }} · {{ gameTitle(tournament, game) }}</p>
          <p class="truncate">
            contre <span class="font-semibold">{{ opponent(game) }}</span>
          </p>
        </div>
        <span class="shrink-0 text-sm text-muted">{{ formatDate(game.scheduled_at) }}</span>
      </button>
    </section>

    <section class="flex flex-col gap-2">
      <h3 class="text-sm font-semibold tracking-wide text-muted uppercase">Matchs joués</h3>
      <p v-if="played.length === 0" class="text-sm text-muted">Aucun match joué pour l'instant.</p>
      <button
        v-for="game in played"
        :key="game.id"
        type="button"
        class="card flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-alt"
        :style="{ borderLeft: `3px solid ${STAGE_ACCENT[game.stage]}` }"
        @click="openedGameId = game.id"
      >
        <div class="min-w-0">
          <p class="text-xs text-muted">M{{ game.number }} · {{ gameTitle(tournament, game) }}</p>
          <p class="truncate">
            contre <span class="font-semibold">{{ opponent(game) }}</span>
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <span
            class="rounded px-1.5 py-0.5 text-xs font-bold"
            :class="result(game).won ? 'bg-winner/15 text-winner' : 'bg-loser/15 text-loser'"
          >
            {{ result(game).won ? 'V' : 'D' }}
          </span>
          <span class="font-display text-lg font-extrabold tabular-nums">
            {{ result(game).own }}–{{ result(game).other }}
          </span>
        </div>
      </button>
    </section>

    <GameModal :tournament="tournament" :game="openedGame" @close="openedGameId = null" />
  </div>
  <p v-else class="text-sm text-muted">Équipe introuvable.</p>
</template>
