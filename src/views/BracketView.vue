<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Game, TournamentDetail } from '@/types'
import { isPlayed, slotLabel, formatDate } from '@/lib/tournament'
import PoolTable from '@/components/PoolTable.vue'
import BracketRow from '@/components/BracketRow.vue'
import GameModal from '@/components/GameModal.vue'

const props = defineProps<{ tournament: TournamentDetail }>()

const highlightTeamId = ref<number | null>(null)
const openedGameId = ref<number | null>(null)
// Résolu depuis le tournoi courant : le modal reste à jour si le
// rafraîchissement automatique apporte un score.
const openedGame = computed(
  () => props.tournament.games.find((g) => g.id === openedGameId.value) ?? null,
)

function open(game: Game) {
  openedGameId.value = game.id
}

const hasDraw = computed(() => props.tournament.games.length > 0)
const hasLoserBracket = computed(() => props.tournament.games.some((g) => g.stage === 'loser'))

// Prochains matchs : affiches connues pas encore jouées, par date puis numéro.
const upcoming = computed(() =>
  props.tournament.games
    .filter((g) => !isPlayed(g) && g.team_a_id !== null && g.team_b_id !== null)
    .sort((a, b) => {
      const da = a.scheduled_at ? Date.parse(a.scheduled_at) : Infinity
      const db = b.scheduled_at ? Date.parse(b.scheduled_at) : Infinity
      return da - db || a.number - b.number
    })
    .slice(0, 4),
)

const qualifSummary = computed(() => {
  const t = props.tournament
  const parts = [`${t.wb_per_group === 1 ? '1er' : `${t.wb_per_group} premiers`} → winner bracket`]
  if (t.lb_per_group > 0)
    parts.push(`${t.lb_per_group === 1 ? 'suivant' : `${t.lb_per_group} suivants`} → loser bracket`)
  return `Matchs en ${t.target_score} points · ${parts.join(' · ')}`
})
</script>

<template>
  <div class="flex flex-col gap-8">
    <div v-if="!hasDraw" class="card p-6 text-center">
      <p class="font-semibold">Le tirage au sort n'a pas encore eu lieu.</p>
      <p class="mt-1 text-sm text-muted">
        {{ tournament.teams.length }} équipes inscrites pour l'instant.
      </p>
    </div>

    <template v-else>
      <section v-if="upcoming.length" class="flex flex-col gap-3">
        <h2 class="text-sm font-semibold tracking-wide text-muted uppercase">À suivre</h2>
        <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <button
            v-for="game in upcoming"
            :key="game.id"
            type="button"
            class="card cursor-pointer px-3 py-2 text-left text-sm hover:bg-surface-alt"
            @click="open(game)"
          >
            <p class="text-[11px] text-muted">
              M{{ game.number }} · {{ formatDate(game.scheduled_at) }}
            </p>
            <p class="truncate font-medium">
              {{ slotLabel(tournament, game, 'a') }} <span class="text-muted">vs</span>
              {{ slotLabel(tournament, game, 'b') }}
            </p>
          </button>
        </div>
      </section>

      <div class="flex flex-wrap gap-1.5" role="group" aria-label="Suivre une équipe">
        <button
          type="button"
          class="cursor-pointer rounded-full border px-3 py-1 text-xs"
          :class="
            highlightTeamId === null
              ? 'border-primary bg-primary/10 text-text'
              : 'border-line text-muted hover:text-text'
          "
          @click="highlightTeamId = null"
        >
          Toutes
        </button>
        <button
          v-for="team in tournament.teams"
          :key="team.id"
          type="button"
          class="cursor-pointer rounded-full border px-3 py-1 text-xs"
          :class="
            highlightTeamId === team.id
              ? 'border-primary bg-primary/10 text-text'
              : 'border-line text-muted hover:text-text'
          "
          @click="highlightTeamId = highlightTeamId === team.id ? null : team.id"
        >
          {{ team.name }}
        </button>
      </div>

      <section class="flex flex-col gap-3">
        <h2 class="text-sm font-semibold tracking-wide text-muted uppercase">Poules</h2>
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <PoolTable
            v-for="pool in tournament.pools"
            :key="pool.id"
            :tournament="tournament"
            :pool="pool"
            :highlight-team-id="highlightTeamId"
            @open="open"
          />
        </div>
        <p class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span>{{ qualifSummary }}</span>
          <span class="flex items-center gap-1.5"
            ><span class="h-3 w-1 rounded-full bg-winner" /> Winner bracket</span
          >
          <span v-if="tournament.lb_per_group" class="flex items-center gap-1.5">
            <span class="h-3 w-1 rounded-full bg-loser" /> Loser bracket
          </span>
        </p>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="text-sm font-semibold tracking-wide text-winner uppercase">Winner bracket</h2>
        <BracketRow
          :tournament="tournament"
          stage="winner"
          with-final
          :highlight-team-id="highlightTeamId"
          @open="open"
        />
      </section>

      <section v-if="hasLoserBracket" class="flex flex-col gap-3">
        <h2 class="text-sm font-semibold tracking-wide text-loser uppercase">Loser bracket</h2>
        <BracketRow
          :tournament="tournament"
          stage="loser"
          :highlight-team-id="highlightTeamId"
          @open="open"
        />
        <p class="text-xs text-muted">
          Le vainqueur du loser bracket rejoint la grande finale · ↘ descente dans le loser bracket
          · en gras : vainqueur du match
        </p>
      </section>
    </template>

    <GameModal :tournament="tournament" :game="openedGame" @close="openedGameId = null" />
  </div>
</template>
