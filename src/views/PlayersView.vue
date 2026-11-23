<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { fetchPlayers } from '@/api/tournaments'
import type { PlayerStats, PlayerWithStats } from '@/types'
import { percent } from '@/lib/format'
import PageTitle from '@/components/ui/PageTitle.vue'

const players = ref<PlayerWithStats[]>([])
const isLoading = ref(true)
const search = ref('')

// Deux classements : le poste d'un joueur sur un match est déduit du gardien
// saisi (gardien = défenseur, son coéquipier = attaquant).
type Role = 'attack' | 'defense'
const role = ref<Role>('attack')
const ROLES: { key: Role; label: string }[] = [
  { key: 'attack', label: 'Attaquants' },
  { key: 'defense', label: 'Défenseurs' },
]

type Column = {
  key: string
  label: string
  title: string
  value: (s: PlayerStats) => number
  display: (s: PlayerStats) => string | number
  cls?: string
}

const perGame = (n: number, games: number) => (games ? n / games : 0)

const COLUMNS: Record<Role, Column[]> = {
  attack: [
    {
      key: 'played',
      label: 'J',
      title: 'Matchs joués en attaque',
      value: (s) => s.games_as_attacker,
      display: (s) => s.games_as_attacker,
    },
    {
      key: 'wins',
      label: 'V',
      title: 'Victoires en attaque',
      value: (s) => s.wins_as_attacker,
      display: (s) => s.wins_as_attacker,
      cls: 'text-winner',
    },
    {
      key: 'losses',
      label: 'D',
      title: 'Défaites en attaque',
      value: (s) => s.games_as_attacker - s.wins_as_attacker,
      display: (s) => s.games_as_attacker - s.wins_as_attacker,
      cls: 'text-loser',
    },
    {
      key: 'rate',
      label: '% V',
      title: 'Pourcentage de victoires en attaque',
      value: (s) => s.attacker_win_rate,
      display: (s) => percent(s.attacker_win_rate),
    },
    {
      key: 'goals',
      label: '⚽',
      title: 'Buts marqués en attaque',
      value: (s) => s.goals_scored_as_attacker,
      display: (s) => (s.games_with_goals_as_attacker ? s.goals_scored_as_attacker : ''),
    },
    {
      key: 'avg',
      label: '⚽/M',
      title: 'Buts par match en attaque (matchs avec buteurs saisis)',
      value: (s) => perGame(s.goals_scored_as_attacker, s.games_with_goals_as_attacker),
      display: (s) =>
        s.games_with_goals_as_attacker
          ? perGame(s.goals_scored_as_attacker, s.games_with_goals_as_attacker).toFixed(1)
          : '',
    },
  ],
  defense: [
    {
      key: 'played',
      label: 'J',
      title: 'Matchs joués en défense',
      value: (s) => s.games_as_keeper,
      display: (s) => s.games_as_keeper,
    },
    {
      key: 'wins',
      label: 'V',
      title: 'Victoires en défense',
      value: (s) => s.wins_as_keeper,
      display: (s) => s.wins_as_keeper,
      cls: 'text-winner',
    },
    {
      key: 'losses',
      label: 'D',
      title: 'Défaites en défense',
      value: (s) => s.games_as_keeper - s.wins_as_keeper,
      display: (s) => s.games_as_keeper - s.wins_as_keeper,
      cls: 'text-loser',
    },
    {
      key: 'rate',
      label: '% V',
      title: 'Pourcentage de victoires en défense',
      value: (s) => s.keeper_win_rate,
      display: (s) => percent(s.keeper_win_rate),
    },
    {
      key: 'goals',
      label: '⚽',
      title: 'Buts marqués en défense',
      value: (s) => s.goals_scored_as_keeper,
      display: (s) => (s.games_with_goals_as_keeper ? s.goals_scored_as_keeper : ''),
    },
    {
      key: 'avg',
      label: '⚽/M',
      title: 'Buts par match en défense (matchs avec buteurs saisis)',
      value: (s) => perGame(s.goals_scored_as_keeper, s.games_with_goals_as_keeper),
      display: (s) =>
        s.games_with_goals_as_keeper
          ? perGame(s.goals_scored_as_keeper, s.games_with_goals_as_keeper).toFixed(1)
          : '',
    },
    {
      key: 'conceded',
      label: '🧤',
      title: 'Buts encaissés en défense',
      value: (s) => s.goals_conceded_as_keeper,
      display: (s) => s.goals_conceded_as_keeper,
    },
    {
      key: 'conceded_avg',
      label: '🧤/M',
      title: 'Buts encaissés par match en défense',
      value: (s) => perGame(s.goals_conceded_as_keeper, s.games_as_keeper),
      display: (s) => perGame(s.goals_conceded_as_keeper, s.games_as_keeper).toFixed(1),
    },
  ],
}

const columns = computed(() => COLUMNS[role.value])
const gamesAtRole = (s: PlayerStats) =>
  role.value === 'attack' ? s.games_as_attacker : s.games_as_keeper

// Tri par colonne (clé commune aux deux postes, donc conservé en changeant d'onglet).
const sortKey = ref<string>('rate')
const sortDesc = ref(true)

onMounted(async () => {
  try {
    players.value = await fetchPlayers()
  } finally {
    isLoading.value = false
  }
})

function sortBy(key: string) {
  if (sortKey.value === key) sortDesc.value = !sortDesc.value
  else {
    sortKey.value = key
    // Moins on encaisse, mieux c'est : tri croissant par défaut.
    sortDesc.value =
      key !== 'name' && !(role.value === 'defense' && ['conceded', 'conceded_avg'].includes(key))
  }
}

const rows = computed(() => {
  const q = search.value.trim().toLowerCase()
  const col = columns.value.find((c) => c.key === sortKey.value)
  return players.value
    .filter((p) => gamesAtRole(p.stats) > 0 && p.name.toLowerCase().includes(q))
    .sort((a, b) => {
      const cmp = col ? col.value(a.stats) - col.value(b.stats) : a.name.localeCompare(b.name)
      // Départage stable : plus de matchs à ce poste d'abord, puis le nom.
      return (
        (sortDesc.value ? -cmp : cmp) ||
        gamesAtRole(b.stats) - gamesAtRole(a.stats) ||
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

    <div class="flex gap-2">
      <button
        v-for="r in ROLES"
        :key="r.key"
        type="button"
        class="pill"
        :class="role === r.key && 'pill-active'"
        @click="role = r.key"
      >
        {{ r.label }}
      </button>
    </div>

    <p v-if="isLoading" class="text-sm text-muted">Chargement…</p>
    <p v-else-if="rows.length === 0" class="text-sm text-muted">
      {{
        search
          ? 'Aucun joueur trouvé.'
          : `Aucun match joué ${role === 'attack' ? 'en attaque' : 'en défense'} pour l'instant (le poste vient du gardien 🧤 saisi sur chaque match).`
      }}
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
              v-for="col in columns"
              :key="col.key"
              class="px-2 py-2.5 text-right whitespace-nowrap last:pr-4"
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
            <td
              v-for="col in columns"
              :key="col.key"
              class="px-2 text-right whitespace-nowrap tabular-nums last:pr-4"
              :class="col.cls"
            >
              {{ col.display(p.stats) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</template>
