<script setup lang="ts">
import TeamBadge from '@/components/TeamBadge.vue'
import { computed, ref } from 'vue'
import type { Game, Pool, TournamentDetail } from '@/types'
import { teamById, teamTint } from '@/lib/tournament'
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

const QUALIF_BAR = { winner: 'bg-winner', loser: 'bg-loser', out: 'bg-surface-alt' }

function signed(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0'
}
</script>

<template>
  <section class="overflow-hidden rounded-3xl bg-surface">
    <header class="flex items-center justify-between px-5 pt-5 pb-3">
      <h3 class="display text-3xl">Poule {{ pool.name }}</h3>
      <!-- Mêmes largeurs que les colonnes des lignes : chaque libellé est centré sur ses chiffres. -->
      <span class="flex text-xs text-muted">
        <span class="w-6 text-center" title="Victoires">V</span>
        <span class="w-6 text-center" title="Défaites">D</span>
        <span class="w-10 text-center" title="Différence de buts">diff</span>
      </span>
    </header>
    <ol>
      <li
        v-for="row in pool.standings"
        :key="row.team_id"
        class="mx-2 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-opacity"
        :class="[highlightTeamId != null && row.team_id !== highlightTeamId ? 'opacity-30' : '']"
        :style="
          highlightTeamId === row.team_id
            ? { background: teamTint(teamById(tournament, row.team_id)?.color, 0.22) }
            : undefined
        "
      >
        <span class="h-5 w-1 rounded-full" :class="QUALIF_BAR[qualification(row.rank)]" />
        <span class="w-4 text-muted tabular-nums">{{ row.rank }}</span>
        <TeamBadge :team="teamById(tournament, row.team_id)" size="sm" />
        <span class="flex-1 truncate font-medium">{{
          teamById(tournament, row.team_id)?.name
        }}</span>
        <span class="flex tabular-nums">
          <span class="w-6 text-center text-muted">{{ row.wins }}</span>
          <span class="w-6 text-center text-muted">{{ row.losses }}</span>
          <span class="w-10 text-center">{{ signed(row.goal_diff) }}</span>
        </span>
      </li>
    </ol>
    <button
      type="button"
      class="m-2 cursor-pointer rounded-full bg-surface-alt px-4 py-2 text-xs font-medium text-muted hover:text-text"
      @click="showGames = !showGames"
    >
      {{ showGames ? 'Masquer les matchs' : `Voir les ${games.length} matchs` }}
    </button>
    <!-- Déroulé / enroulé : la rangée de la grille passe de 0fr à 1fr (hauteur
         animée sans la connaître), le contenu glisse et apparaît en fondu.
         Inerte une fois replié (pas de focus sur des matchs cachés). -->
    <div
      class="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
      :class="showGames ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
      :inert="!showGames"
    >
      <div class="overflow-hidden">
        <div
          class="grid gap-3 p-3 pt-1 transition duration-300 ease-out motion-reduce:transition-none sm:grid-cols-2"
          :class="showGames ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0'"
        >
          <GameCard
            v-for="game in games"
            :key="game.id"
            :tournament="tournament"
            :game="game"
            :highlight-team-id="highlightTeamId"
            @open="$emit('open', $event)"
          />
        </div>
      </div>
    </div>
  </section>
</template>
