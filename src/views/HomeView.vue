<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { fetchStats } from '@/api/tournaments'
import { useTournamentStore } from '@/stores/tournament'
import { percent, plural } from '@/lib/format'
import type { GlobalStats, PlayerWithStats } from '@/types'
import StatTile from '@/components/StatTile.vue'
import TournamentCard from '@/components/TournamentCard.vue'

const store = useTournamentStore()
const stats = ref<GlobalStats | null>(null)
const isLoading = ref(true)

onMounted(async () => {
  try {
    const [, s] = await Promise.all([store.loadList(), fetchStats()])
    stats.value = s
  } finally {
    isLoading.value = false
  }
})

const live = computed(() =>
  store.list.filter((t) => t.status === 'groups' || t.status === 'bracket'),
)

function playerLink(p: PlayerWithStats) {
  return { name: 'player', params: { playerId: p.id } }
}

// Tuiles "pour rire" : chacune est masquée tant qu'il n'y a pas de quoi la remplir.
const funTiles = computed(() => {
  const s = stats.value
  if (!s || s.games_played === 0) return []
  const tiles = [
    s.best_player && {
      emoji: '👑',
      label: 'Meilleur joueur',
      value: s.best_player.name,
      detail: `${percent(s.best_player.stats.win_rate)} de victoires sur ${plural(s.best_player.stats.played, 'match')}`,
      to: playerLink(s.best_player),
    },
    s.worst_player && {
      emoji: '🥄',
      label: 'Cuillère de bois',
      value: s.worst_player.name,
      detail: `${percent(s.worst_player.stats.win_rate)} de victoires… courage !`,
      to: playerLink(s.worst_player),
    },
    s.top_scorer && {
      emoji: '🔫',
      label: 'Gâchette d’or',
      value: s.top_scorer.name,
      detail: `${plural(s.top_scorer.stats.goals_for, 'but')} marqués`,
      to: playerLink(s.top_scorer),
    },
    s.leakiest && {
      emoji: '🧽',
      label: 'La passoire',
      value: s.leakiest.name,
      detail: `${(s.leakiest.stats.goals_against / s.leakiest.stats.played).toFixed(1)} buts encaissés par match`,
      to: playerLink(s.leakiest),
    },
    s.most_titles && {
      emoji: '🏆',
      label: 'Collectionneur de titres',
      value: s.most_titles.name,
      detail: plural(s.most_titles.stats.titles, 'tournoi gagné', 'tournois gagnés'),
      to: playerLink(s.most_titles),
    },
    s.fanny_victim && {
      emoji: '🙈',
      label: 'Abonné au dessous du baby',
      value: s.fanny_victim.name,
      detail: plural(s.fanny_victim.stats.fannys_taken, 'fanny encaissée', 'fannys encaissées'),
      to: playerLink(s.fanny_victim),
    },
  ]
  return tiles.filter((t) => !!t)
})
</script>

<template>
  <main class="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8">
    <section class="flex flex-col gap-2">
      <h1 class="font-display text-3xl font-extrabold sm:text-4xl">
        Baby <span class="text-final">Krebs</span>
      </h1>
      <p class="text-muted">Les tournois de baby-foot, les scores, et surtout les moqueries.</p>
    </section>

    <p v-if="isLoading" class="text-sm text-muted">Chargement…</p>

    <template v-else>
      <section class="flex flex-col gap-3">
        <h2
          class="flex items-center gap-2 text-sm font-semibold tracking-wide text-muted uppercase"
        >
          <span v-if="live.length" class="h-2 w-2 animate-pulse rounded-full bg-loser" /> Tournoi en
          cours
        </h2>
        <TournamentCard v-for="t in live" :key="t.id" :tournament="t" featured />
        <p v-if="live.length === 0" class="card p-5 text-sm text-muted">
          Pas de tournoi en cours pour le moment.
          <RouterLink :to="{ name: 'tournaments' }" class="text-primary hover:underline"
            >Voir tous les tournois →</RouterLink
          >
        </p>
      </section>

      <section v-if="funTiles.length" class="flex flex-col gap-4">
        <div class="flex items-baseline justify-between gap-3">
          <h2 class="font-display text-xl font-extrabold">Le coin des stats</h2>
          <RouterLink :to="{ name: 'players' }" class="text-sm text-muted hover:text-text"
            >Tous les joueurs →</RouterLink
          >
        </div>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatTile v-for="tile in funTiles" :key="tile.label" v-bind="tile" />
        </div>
        <p v-if="stats" class="text-xs text-muted">
          Meilleur joueur et cuillère de bois : au moins
          {{ plural(stats.min_games_for_ranking, 'match', 'matchs') }} joués.
        </p>
      </section>
    </template>
  </main>
</template>
