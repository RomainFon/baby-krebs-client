import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchTournament, fetchTournaments } from '@/api/tournaments'
import type { TournamentDetail, TournamentSummary } from '@/types'

export const useTournamentStore = defineStore('tournament', () => {
  const list = ref<TournamentSummary[]>([])
  const current = ref<TournamentDetail | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function loadList() {
    list.value = await fetchTournaments()
    return list.value
  }

  async function load(id: number, { silent = false } = {}) {
    if (!silent) isLoading.value = true
    error.value = null
    try {
      current.value = await fetchTournament(id)
    } catch {
      error.value = 'Tournoi introuvable.'
      current.value = null
    } finally {
      isLoading.value = false
    }
  }

  // Les actions admin renvoient le tournoi complet : on remplace l'état tel
  // quel, et on resynchronise la liste (statut, nombre d'équipes).
  function replace(detail: TournamentDetail) {
    current.value = detail
    const index = list.value.findIndex((t) => t.id === detail.id)
    const played = detail.games.filter((g) => g.score_a !== null && g.score_b !== null)
    const summary: TournamentSummary = {
      ...detail,
      teams_count: detail.teams.length,
      games_played: played.length,
      games_total: detail.games.length,
    }
    if (index === -1) list.value.unshift(summary)
    else list.value[index] = summary
  }

  function remove(id: number) {
    list.value = list.value.filter((t) => t.id !== id)
    if (current.value?.id === id) current.value = null
  }

  return { list, current, isLoading, error, loadList, load, replace, remove }
})
