<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Game, TournamentDetail } from '@/types'
import { gameTitle, isPlayed, slotLabel, STAGE_ACCENT, winnerSlot } from '@/lib/tournament'
import GameModal from '@/components/GameModal.vue'

const props = defineProps<{ tournament: TournamentDetail }>()

type Filter = 'upcoming' | 'played' | 'all'
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'upcoming', label: 'À venir' },
  { key: 'played', label: 'Joués' },
  { key: 'all', label: 'Tous' },
]
const filter = ref<Filter>('upcoming')

const openedGameId = ref<number | null>(null)
const openedGame = computed(
  () => props.tournament.games.find((g) => g.id === openedGameId.value) ?? null,
)

function dateOf(game: Game): string | null {
  return game.scheduled_at ?? game.played_at
}

// Matchs regroupés par jour ; ceux sans date à la fin. Les matchs joués
// sont listés du plus récent au plus ancien, les autres dans l'ordre.
const days = computed(() => {
  const games = props.tournament.games
    .filter((g) => filter.value === 'all' || (filter.value === 'played') === isPlayed(g))
    .sort((a, b) => {
      const da = dateOf(a) ? Date.parse(dateOf(a)!) : Infinity
      const db = dateOf(b) ? Date.parse(dateOf(b)!) : Infinity
      return da - db || a.number - b.number
    })
  if (filter.value === 'played') games.reverse()

  const groups = new Map<string, Game[]>()
  for (const game of games) {
    const iso = dateOf(game)
    const key = iso
      ? new Date(iso).toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })
      : 'Date à définir'
    groups.set(key, [...(groups.get(key) ?? []), game])
  }
  return [...groups.entries()].map(([label, games]) => ({ label, games }))
})

function time(game: Game): string {
  const iso = dateOf(game)
  return iso
    ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '–'
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="flex gap-1.5">
      <button
        v-for="f in FILTERS"
        :key="f.key"
        type="button"
        class="pill"
        :class="filter === f.key && 'pill-active'"
        @click="filter = f.key"
      >
        {{ f.label }}
      </button>
    </div>

    <p v-if="tournament.games.length === 0" class="text-sm text-muted">
      Les matchs seront générés au tirage au sort.
    </p>
    <p v-else-if="days.length === 0" class="text-sm text-muted">
      {{
        filter === 'upcoming' ? 'Plus aucun match à jouer 🎉' : 'Aucun match joué pour l’instant.'
      }}
    </p>

    <section v-for="day in days" :key="day.label" class="flex flex-col gap-2">
      <h2 class="text-sm font-semibold tracking-wide text-muted uppercase first-letter:uppercase">
        {{ day.label }}
      </h2>
      <button
        v-for="game in day.games"
        :key="game.id"
        type="button"
        class="card flex cursor-pointer items-center gap-4 px-4 py-3 text-left hover:bg-surface-alt"
        :style="{ borderLeft: `3px solid ${STAGE_ACCENT[game.stage]}` }"
        @click="openedGameId = game.id"
      >
        <span class="w-12 shrink-0 text-sm tabular-nums text-muted">{{ time(game) }}</span>
        <div class="min-w-0 flex-1">
          <p class="text-[11px] text-muted">
            M{{ game.number }} · {{ gameTitle(tournament, game) }}
          </p>
          <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <span
              class="truncate text-right"
              :class="[
                game.team_a_id === null && 'italic text-muted',
                winnerSlot(game) === 'a' && 'font-semibold',
                winnerSlot(game) === 'b' && 'text-muted',
              ]"
            >
              {{ slotLabel(tournament, game, 'a') }}
            </span>
            <span class="font-display tabular-nums">
              <template v-if="isPlayed(game)">{{ game.score_a }} – {{ game.score_b }}</template>
              <span v-else class="text-sm font-normal text-muted">vs</span>
            </span>
            <span
              class="truncate"
              :class="[
                game.team_b_id === null && 'italic text-muted',
                winnerSlot(game) === 'b' && 'font-semibold',
                winnerSlot(game) === 'a' && 'text-muted',
              ]"
            >
              {{ slotLabel(tournament, game, 'b') }}
            </span>
          </div>
        </div>
      </button>
    </section>

    <GameModal :tournament="tournament" :game="openedGame" @close="openedGameId = null" />
  </div>
</template>
