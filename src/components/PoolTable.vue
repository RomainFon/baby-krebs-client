<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Game, Pool, TournamentDetail } from '@/types'
import { teamById } from '@/lib/tournament'
import GameCard from '@/components/GameCard.vue'

const props = defineProps<{
  tournament: TournamentDetail
  pool: Pool
  highlightTeamId?: number | null
}>()
defineEmits<{ open: [game: Game] }>()

const showGames = ref(false)

const games = computed(() =>
  props.tournament.games
    .filter((g) => g.pool_id === props.pool.id)
    .sort((a, b) => a.number - b.number),
)

function qualification(rank: number): 'winner' | 'loser' | 'out' {
  if (rank <= props.tournament.wb_per_group) return 'winner'
  if (rank <= props.tournament.wb_per_group + props.tournament.lb_per_group) return 'loser'
  return 'out'
}

const QUALIF_BAR = { winner: 'bg-winner', loser: 'bg-loser', out: 'bg-line' }

function signed(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0'
}
</script>

<template>
  <section class="card overflow-hidden">
    <header class="flex items-center justify-between border-b border-line px-4 py-2.5">
      <h3 class="font-display font-extrabold">Poule {{ pool.name }}</h3>
      <span class="text-xs text-muted">V · D · diff</span>
    </header>
    <ol>
      <li
        v-for="row in pool.standings"
        :key="row.team_id"
        class="flex items-center gap-3 px-4 py-2 text-sm not-last:border-b not-last:border-line transition-opacity"
        :class="[
          highlightTeamId != null && row.team_id !== highlightTeamId ? 'opacity-30' : '',
          highlightTeamId === row.team_id ? 'bg-primary/10' : '',
        ]"
      >
        <span class="h-5 w-1 rounded-full" :class="QUALIF_BAR[qualification(row.rank)]" />
        <span class="w-4 text-muted tabular-nums">{{ row.rank }}</span>
        <span class="flex-1 truncate font-medium">{{
          teamById(tournament, row.team_id)?.name
        }}</span>
        <span class="tabular-nums text-muted">{{ row.wins }} · {{ row.losses }} ·</span>
        <span class="w-8 text-right tabular-nums">{{ signed(row.goal_diff) }}</span>
      </li>
    </ol>
    <button
      type="button"
      class="w-full cursor-pointer border-t border-line px-4 py-2 text-left text-xs text-muted hover:text-text"
      @click="showGames = !showGames"
    >
      {{ showGames ? 'Masquer les matchs' : `Voir les ${games.length} matchs` }}
    </button>
    <div v-if="showGames" class="grid gap-3 border-t border-line p-3 sm:grid-cols-2">
      <GameCard
        v-for="game in games"
        :key="game.id"
        :tournament="tournament"
        :game="game"
        :highlight-team-id="highlightTeamId"
        @open="$emit('open', $event)"
      />
    </div>
  </section>
</template>
