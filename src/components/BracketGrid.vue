<script setup lang="ts">
import { computed } from 'vue'
import type { Game, Stage, TournamentDetail } from '@/types'
import { roundLabel } from '@/lib/tournament'
import GameCard from '@/components/GameCard.vue'
import BracketLinks from '@/components/BracketLinks.vue'

// Phase finale sur une seule grille (retours du 2026-11-23) : Ligue des
// champions en haut, Ligue des espoirs en bas, colonnes partagées. Les deux
// finales de ligue sont alignées dans la dernière colonne de l'arbre (quitte
// à laisser des colonnes vides en Ligue des champions) et la grande finale a
// sa propre colonne, tout à droite, centrée entre les deux.
const props = defineProps<{ tournament: TournamentDetail; highlightTeamId?: number | null }>()
defineEmits<{ open: [game: Game] }>()

type Column = { label: string; games: Game[] } | null

function stageGames(stage: Stage) {
  return props.tournament.games.filter((g) => g.stage === stage)
}

const wbGames = computed(() => stageGames('winner'))
const lbGames = computed(() => stageGames('loser'))
const finalGames = computed(() => stageGames('final'))
const maxRound = (games: Game[]) => Math.max(0, ...games.map((g) => g.round))

// Nombre de colonnes de l'arbre (hors grande finale).
const span = computed(() => Math.max(maxRound(wbGames.value), maxRound(lbGames.value)))

/** Une case par colonne ; le dernier tour d'une ligue va dans la dernière colonne. */
function columns(stage: Stage, games: Game[]): Column[] {
  const rounds = maxRound(games)
  const cols: Column[] = Array.from({ length: span.value }, () => null)
  for (let round = 1; round <= rounds; round++) {
    const index = round === rounds ? span.value - 1 : round - 1
    cols[index] = {
      label: roundLabel(stage, round, rounds),
      games: games.filter((g) => g.round === round).sort((a, b) => a.position - b.position),
    }
  }
  return cols
}

const sections = computed(() =>
  [
    {
      stage: 'winner' as const,
      title: 'Ligue des champions',
      cls: 'text-winner',
      games: wbGames.value,
    },
    {
      stage: 'loser' as const,
      title: 'Ligue des espoirs',
      cls: 'text-loser',
      games: lbGames.value,
    },
  ]
    .filter((s) => s.games.length > 0)
    .map((s, i) => ({ ...s, titleRow: 2 * i + 1, cols: columns(s.stage, s.games) })),
)

const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${span.value + (finalGames.value.length ? 1 : 0)}, 12.5rem)`,
}))
// Grande finale : de la première rangée de matchs à la dernière.
const finalRows = computed(() => `2 / ${2 * sections.value.length + 1}`)
</script>

<template>
  <div class="relative grid w-max min-w-full gap-x-6" :style="gridStyle">
    <template v-for="section in sections" :key="section.stage">
      <h2
        class="section-title mb-3"
        :class="[section.cls, section.titleRow > 1 && 'mt-8']"
        :style="{ gridColumn: `1 / span ${span}`, gridRow: section.titleRow }"
      >
        {{ section.title }}
      </h2>
      <div
        v-for="(col, i) in section.cols"
        :key="`${section.stage}-${i}`"
        class="flex flex-col"
        :style="{ gridColumn: i + 1, gridRow: section.titleRow + 1 }"
      >
        <template v-if="col">
          <h4
            class="mb-3 w-fit rounded-full bg-surface-alt px-3 py-1 text-xs font-semibold text-muted"
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
        </template>
      </div>
    </template>

    <div
      v-if="finalGames.length"
      class="flex flex-col justify-center"
      :style="{ gridColumn: span + 1, gridRow: finalRows }"
    >
      <h4
        class="mb-3 w-fit rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-text"
      >
        Grande finale
      </h4>
      <div class="flex flex-col gap-5">
        <GameCard
          v-for="game in finalGames"
          :key="game.id"
          :tournament="tournament"
          :game="game"
          :highlight-team-id="highlightTeamId"
          show-loser-destination
          @open="$emit('open', $event)"
        />
      </div>
    </div>

    <BracketLinks :tournament="tournament" :highlight-team-id="highlightTeamId" />
  </div>
</template>
