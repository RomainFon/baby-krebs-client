<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { deletePlayer, fetchPlayers } from '@/api/tournaments'
import type { PlayerRef, PlayerWithStats } from '@/types'
import { sortByName } from '@/lib/players'
import { extractErrorMessage } from '@/lib/apiError'
import { plural } from '@/lib/format'
import AdminTabs from '@/components/admin/AdminTabs.vue'
import PlayerFormModal from '@/components/admin/PlayerFormModal.vue'

const players = ref<PlayerWithStats[]>([])
const isLoading = ref(true)
const search = ref('')
const error = ref<string | null>(null)

// Modale : création (player = null) ou renommage.
const modalOpen = ref(false)
const editing = ref<PlayerRef | null>(null)

async function load() {
  players.value = await fetchPlayers()
}

onMounted(async () => {
  try {
    await load()
  } finally {
    isLoading.value = false
  }
})

const rows = computed(() => {
  const q = search.value.trim().toLowerCase()
  return sortByName(players.value.filter((p) => p.name.toLowerCase().includes(q)))
})

function openCreate() {
  editing.value = null
  modalOpen.value = true
}

function openRename(player: PlayerRef) {
  editing.value = player
  modalOpen.value = true
}

async function remove(player: PlayerWithStats) {
  if (!confirm(`Supprimer ${player.name} ?`)) return
  error.value = null
  try {
    await deletePlayer(player.id)
    await load()
  } catch (e) {
    error.value = extractErrorMessage(e, 'Suppression impossible.')
  }
}
</script>

<template>
  <main class="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-display text-2xl font-extrabold">Administration</h1>
      <button type="button" class="btn-primary" @click="openCreate">+ Nouveau joueur</button>
    </div>
    <AdminTabs />

    <input
      v-model="search"
      type="search"
      placeholder="Rechercher un joueur…"
      class="field sm:w-64"
    />

    <p
      v-if="error"
      class="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
    >
      {{ error }}
    </p>

    <p v-if="isLoading" class="text-sm text-muted">Chargement…</p>
    <p v-else-if="players.length === 0" class="card p-6 text-center text-sm text-muted">
      Aucun joueur pour l'instant : crée les premiers avant d'inscrire des équipes.
    </p>

    <ul v-else class="card flex flex-col divide-y divide-line">
      <li v-for="p in rows" :key="p.id" class="flex items-center justify-between gap-3 px-4 py-2.5">
        <div class="min-w-0">
          <RouterLink
            :to="{ name: 'player', params: { playerId: p.id } }"
            class="truncate font-medium hover:underline"
          >
            {{ p.name }}
          </RouterLink>
          <p class="text-xs text-muted">
            {{ plural(p.stats.tournaments, 'tournoi') }} ·
            {{ plural(p.stats.played, 'match', 'matchs') }}
          </p>
        </div>
        <div class="flex shrink-0 gap-2">
          <button type="button" class="btn-ghost py-1 text-xs" @click="openRename(p)">
            Renommer
          </button>
          <!-- Un joueur déjà inscrit dans une équipe garde son historique. -->
          <button
            v-if="p.stats.tournaments === 0"
            type="button"
            class="btn-danger py-1 text-xs"
            @click="remove(p)"
          >
            Supprimer
          </button>
        </div>
      </li>
    </ul>

    <PlayerFormModal :open="modalOpen" :player="editing" @close="modalOpen = false" @saved="load" />
  </main>
</template>
