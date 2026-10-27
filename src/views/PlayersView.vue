<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { fetchPlayers } from '@/api/tournaments'
import type { PlayerStats, PlayerWithStats } from '@/types'
import { percent, signed } from '@/lib/format'
import PageTitle from '@/components/ui/PageTitle.vue'

const players = ref<PlayerWithStats[]>([])
const isLoading = ref(true)
const search = ref('')

type SortKey = 'name' | keyof PlayerStats
const sortKey = ref<SortKey>('win_rate')
const sortDesc = ref(true)

const COLUMNS: { key: SortKey; label: string; title: string }[] = [
  { key: 'played', label: 'J', title: 'Matchs joués' },
  { key: 'wins', label: 'V', title: 'Victoires' },
  { key: 'losses', label: 'D', title: 'Défaites' },
  { key: 'win_rate', label: '% V', title: 'Pourcentage de victoires' },
  { key: 'goals_scored', label: '⚽', title: 'Buts marqués par le joueur' },
  { key: 'goal_diff', label: 'Diff', title: 'Différence de buts' },
  { key: 'tournaments', label: 'Tournois', title: 'Tournois disputés' },
  { key: 'titles', label: '🏆', title: 'Tournois gagnés' },
]

onMounted(async () => {
  try {
    players.value = await fetchPlayers()
  } finally {
    isLoading.value = false
  }
})

function sortBy(key: SortKey) {
  if (sortKey.value === key) sortDesc.value = !sortDesc.value
  else {
    sortKey.value = key
    sortDesc.value = key !== 'name'
  }
}

const rows = computed(() => {
  const q = search.value.trim().toLowerCase()
  const key = sortKey.value
  return players.value
    .filter((p) => p.name.toLowerCase().includes(q))
    .sort((a, b) => {
      const va = key === 'name' ? a.name : a.stats[key]
      const vb = key === 'name' ? b.name : b.stats[key]
      // Départage stable : plus de matchs joués d'abord, puis le nom.
      const cmp =
        typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number)
      return (
        (sortDesc.value ? -cmp : cmp) ||
        b.stats.played - a.stats.played ||
        a.name.localeCompare(b.name)
      )
    })
})
</script>

<template>
  <main class="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <PageTitle kicker="Explorer les" title="Joueurs" />
      <input
        v-model="search"
        type="search"
        placeholder="Rechercher…"
        class="field w-full sm:w-56"
      />
    </div>

    <p v-if="isLoading" class="text-sm text-muted">Chargement…</p>
    <p v-else-if="players.length === 0" class="text-sm text-muted">
      Aucun joueur inscrit pour l'instant.
    </p>

    <div v-else class="card -mx-4 overflow-x-auto sm:mx-0">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-line text-xs text-muted">
            <th class="px-4 py-2.5 text-left">
              <button type="button" class="cursor-pointer hover:text-text" @click="sortBy('name')">
                Joueur {{ sortKey === 'name' ? (sortDesc ? '↓' : '↑') : '' }}
              </button>
            </th>
            <th
              v-for="col in COLUMNS"
              :key="col.key"
              class="px-2 py-2.5 text-right whitespace-nowrap"
              :title="col.title"
            >
              <button
                type="button"
                class="cursor-pointer hover:text-text"
                :class="sortKey === col.key && 'text-text'"
                @click="sortBy(col.key)"
              >
                {{ col.label }} {{ sortKey === col.key ? (sortDesc ? '↓' : '↑') : '' }}
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(p, i) in rows"
            :key="p.id"
            class="border-b border-line last:border-0 hover:bg-surface-alt"
          >
            <td class="px-4 py-2.5">
              <RouterLink
                :to="{ name: 'player', params: { playerId: p.id } }"
                class="flex items-center gap-2 font-medium"
              >
                <span class="w-5 text-xs text-muted tabular-nums">{{ i + 1 }}</span>
                <span class="hover:underline">{{ p.name }}</span>
              </RouterLink>
            </td>
            <td class="px-2 text-right tabular-nums">{{ p.stats.played }}</td>
            <td class="px-2 text-right tabular-nums text-winner">{{ p.stats.wins }}</td>
            <td class="px-2 text-right tabular-nums text-loser">{{ p.stats.losses }}</td>
            <td class="px-2 text-right tabular-nums">
              {{ p.stats.played ? percent(p.stats.win_rate) : '–' }}
            </td>
            <td class="px-2 text-right tabular-nums">{{ p.stats.goals_scored || '' }}</td>
            <td class="px-2 text-right tabular-nums">{{ signed(p.stats.goal_diff) }}</td>
            <td class="px-2 text-right tabular-nums">{{ p.stats.tournaments }}</td>
            <td class="px-2 pr-4 text-right tabular-nums">{{ p.stats.titles || '' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</template>
