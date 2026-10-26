<script setup lang="ts">
import { computed } from 'vue'
import type { Game, Stage, TournamentDetail } from '@/types'
import { roundLabel } from '@/lib/tournament'
import GameCard from '@/components/GameCard.vue'

// Une ligne de l'arbre (winner ou loser bracket) : une colonne par tour,
// matchs répartis verticalement (justify-around) pour dessiner l'entonnoir.
// La grande finale peut être ajoutée en dernière colonne.
const props = defineProps<{
  tournament: TournamentDetail
  stage: Stage
  highlightTeamId?: number | null
  withFinal?: boolean
}>()
defineEmits<{ open: [game: Game] }>()

const columns = computed(() => {
  const games = props.tournament.games.filter((g) => g.stage === props.stage)
  const maxRound = Math.max(0, ...games.map((g) => g.round))
  const cols = []
  for (let round = 1; round <= maxRound; round++) {
    cols.push({
      key: `${props.stage}-${round}`,
      label: roundLabel(props.stage, round, maxRound),
      games: games.filter((g) => g.round === round).sort((a, b) => a.position - b.position),
      final: false,
    })
  }
  if (props.withFinal) {
    const final = props.tournament.games.filter((g) => g.stage === 'final')
    if (final.length) cols.push({ key: 'final', label: 'Grande finale', games: final, final: true })
  }
  return cols
})
</script>

<template>
  <div class="-mx-4 overflow-x-auto px-4 pb-2">
    <div class="flex min-w-max gap-6">
      <div v-for="col in columns" :key="col.key" class="flex w-52 flex-col">
        <h4
          class="mb-3 text-xs font-semibold tracking-wide uppercase"
          :class="col.final ? 'text-final' : 'text-muted'"
        >
          {{ col.label }}
        </h4>
        <div class="flex flex-1 flex-col justify-around gap-5">
          <GameCard
            v-for="game in col.games"
            :key="game.id"
            :tournament="tournament"
            :game="game"
            :highlight-team-id="highlightTeamId"
            show-loser-destination
            @open="$emit('open', $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
