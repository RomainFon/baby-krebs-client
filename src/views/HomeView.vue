<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { fetchStats } from '@/api/tournaments'
import { useTournamentStore } from '@/stores/tournament'
import { percent, plural } from '@/lib/format'
import type { GlobalStats, PlayerWithStats } from '@/types'
import StatTile from '@/components/StatTile.vue'
import TournamentCard from '@/components/TournamentCard.vue'
import MatchupCard from '@/components/MatchupCard.vue'
import GameModal from '@/components/GameModal.vue'
import PageTitle from '@/components/ui/PageTitle.vue'

const store = useTournamentStore()
const stats = ref<GlobalStats | null>(null)
const isLoading = ref(true)

onMounted(async () => {
  try {
    const [, s] = await Promise.all([store.loadList(), fetchStats()])
    stats.value = s
    const first = live.value[0]
    if (first && store.current?.id !== first.id) await store.load(first.id)
  } finally {
    isLoading.value = false
  }
})

const live = computed(() =>
  store.list.filter((t) => t.status === 'groups' || t.status === 'bracket'),
)

// Détail du premier tournoi en cours, pour afficher son prochain match.
const liveDetail = computed(() => (store.current?.id === live.value[0]?.id ? store.current : null))
const nextGame = computed(() => {
  const t = liveDetail.value
  if (!t) return null
  return (
    t.games
      .filter((g) => g.score_a === null && g.team_a_id !== null && g.team_b_id !== null)
      .sort((a, b) => {
        const da = a.scheduled_at ? Date.parse(a.scheduled_at) : Infinity
        const db = b.scheduled_at ? Date.parse(b.scheduled_at) : Infinity
        return da - db || a.number - b.number
      })[0] ?? null
  )
})
const openedGameId = ref<number | null>(null)
const openedGame = computed(
  () => liveDetail.value?.games.find((g) => g.id === openedGameId.value) ?? null,
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
      variant: 'lime' as const,
      emoji: '👑',
      label: 'Meilleur joueur',
      value: s.best_player.name,
      detail: `${percent(s.best_player.stats.win_rate)} de victoires sur ${plural(s.best_player.stats.played, 'match')}`,
      to: playerLink(s.best_player),
    },
    s.worst_player && {
      variant: 'paper' as const,
      emoji: '💩',
      label: 'Le Valère Germain du baby',
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
  <main class="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-6 sm:py-10">
    <PageTitle kicker="Bienvenue sur" title="Baby Krebs" />

    <p v-if="isLoading" class="text-sm text-muted">Chargement…</p>

    <template v-else>
      <section class="flex flex-col gap-4">
        <h2 class="section-title">Tournoi en cours</h2>
        <div v-if="live.length" class="grid gap-4 lg:grid-cols-2">
          <TournamentCard v-for="t in live" :key="t.id" :tournament="t" featured />
          <div v-if="liveDetail && nextGame" class="flex flex-col gap-2">
            <p class="px-1 text-sm text-muted">Prochain match</p>
            <MatchupCard
              :tournament="liveDetail"
              :game="nextGame"
              @open="openedGameId = $event.id"
            />
          </div>
        </div>
        <div
          v-else
          class="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-surface p-6"
        >
          <p class="text-muted">Pas de tournoi en cours pour le moment.</p>
          <RouterLink :to="{ name: 'tournaments' }" class="btn-primary"
            >Voir tous les tournois</RouterLink
          >
        </div>
      </section>

      <section v-if="funTiles.length" class="flex flex-col gap-4">
        <div class="flex items-baseline justify-between gap-3">
          <h2 class="section-title">Le coin des stats</h2>
          <RouterLink :to="{ name: 'players' }" class="text-sm text-muted hover:text-text">
            Tous les joueurs →
          </RouterLink>
        </div>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatTile v-for="tile in funTiles" :key="tile.label" v-bind="tile" />
        </div>
      </section>
    </template>

    <GameModal
      v-if="liveDetail"
      :tournament="liveDetail"
      :game="openedGame"
      @close="openedGameId = null"
    />
  </main>
</template>
