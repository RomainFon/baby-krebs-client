<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { fetchPlayer } from '@/api/tournaments'
import type { PlayerDetail } from '@/types'
import { formatDate, STAGE_ACCENT, STATUS_LABELS } from '@/lib/tournament'
import { percent, plural, signed } from '@/lib/format'
import AppIcon from '@/components/ui/AppIcon.vue'

const props = defineProps<{ playerId: number }>()

const player = ref<PlayerDetail | null>(null)
const error = ref<string | null>(null)

watch(
  () => props.playerId,
  async (id) => {
    error.value = null
    try {
      player.value = await fetchPlayer(id)
    } catch {
      error.value = 'Joueur introuvable.'
    }
  },
  { immediate: true },
)

const tiles = computed(() => {
  const s = player.value?.stats
  if (!s) return []
  return [
    { label: 'Matchs', value: s.played },
    { label: 'Victoires', value: s.wins, cls: 'text-winner' },
    { label: 'Défaites', value: s.losses, cls: 'text-loser' },
    { label: '% victoires', value: s.played ? percent(s.win_rate) : '–', variant: 'lime' },
    { label: 'Buts pour', value: s.goals_for },
    { label: 'Buts contre', value: s.goals_against },
    { label: 'Différence', value: signed(s.goal_diff) },
    { label: 'Titres', value: s.titles ? `🏆 ${s.titles}` : '0', variant: 'paper' },
  ]
})

// Petite phrase de bilan, pour le folklore.
const verdict = computed(() => {
  const s = player.value?.stats
  if (!s || s.played === 0) return 'Pas encore de match joué : tout reste à prouver.'
  if (s.titles > 0) return `Déjà ${plural(s.titles, 'titre')} au compteur. Respect.`
  if (s.fannys_taken > 0)
    return `A déjà dû passer sous le baby ${s.fannys_taken > 1 ? `${s.fannys_taken} fois` : 'une fois'} 🙈`
  if (s.win_rate >= 0.7) return 'Une valeur sûre, à prendre dans son équipe.'
  if (s.win_rate <= 0.3) return 'Le cœur y est, les buts un peu moins.'
  return 'Un joueur solide, ni héros ni zéro.'
})
</script>

<template>
  <main class="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6">
    <RouterLink
      :to="{ name: 'players' }"
      class="flex h-11 w-11 items-center justify-center rounded-full bg-surface-alt text-muted hover:text-text"
      aria-label="Tous les joueurs"
    >
      <AppIcon name="arrow-left" class="h-5 w-5" />
    </RouterLink>

    <p v-if="error" class="text-sm text-danger">{{ error }}</p>
    <p v-else-if="!player" class="text-sm text-muted">Chargement…</p>

    <template v-else>
      <header>
        <p class="kicker">Joueur</p>
        <h1 class="display text-6xl sm:text-8xl">{{ player.name }}</h1>
        <p class="text-muted">{{ verdict }}</p>
      </header>

      <dl class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div
          v-for="t in tiles"
          :key="t.label"
          class="rounded-3xl px-5 py-4"
          :class="
            'variant' in t
              ? t.variant === 'lime'
                ? 'bg-primary text-primary-text'
                : 'bg-paper text-ink'
              : 'bg-surface'
          "
        >
          <dt class="text-xs" :class="'variant' in t ? 'opacity-60' : 'text-muted'">
            {{ t.label }}
          </dt>
          <dd class="display text-3xl tabular-nums" :class="t.cls">
            {{ t.value }}
          </dd>
        </div>
      </dl>

      <div class="grid gap-6 md:grid-cols-2">
        <section class="flex flex-col gap-2">
          <h2 class="section-title">Coéquipiers</h2>
          <p v-if="player.partners.length === 0" class="text-sm text-muted">
            Aucun pour l'instant.
          </p>
          <RouterLink
            v-for="partner in player.partners"
            :key="partner.id"
            :to="{ name: 'player', params: { playerId: partner.id } }"
            class="card flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-surface-alt"
          >
            <span class="font-medium">{{ partner.name }}</span>
            <span class="text-xs text-muted">
              {{ partner.wins }} V / {{ plural(partner.played, 'match', 'matchs') }}
            </span>
          </RouterLink>
        </section>

        <section class="flex flex-col gap-2">
          <h2 class="section-title">Tournois</h2>
          <RouterLink
            v-for="team in player.teams"
            :key="team.id"
            :to="{ name: 'team', params: { tournamentId: team.tournament_id, teamId: team.id } }"
            class="card flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-surface-alt"
          >
            <div class="min-w-0">
              <p class="truncate font-medium">{{ team.tournament_name }}</p>
              <p class="truncate text-xs text-muted">
                {{ team.name }} · avec {{ team.partner.name }}
              </p>
            </div>
            <span class="shrink-0 text-xs text-muted">{{
              STATUS_LABELS[team.tournament_status]
            }}</span>
          </RouterLink>
        </section>
      </div>

      <section class="flex flex-col gap-2">
        <h2 class="section-title">Derniers matchs</h2>
        <p v-if="player.games.length === 0" class="text-sm text-muted">Aucun match joué.</p>
        <RouterLink
          v-for="game in player.games"
          :key="game.id"
          :to="{ name: 'games', params: { tournamentId: game.tournament_id } }"
          class="card flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-surface-alt"
          :style="{ borderLeft: `3px solid ${STAGE_ACCENT[game.stage]}` }"
        >
          <div class="min-w-0">
            <p class="truncate text-xs text-muted">
              {{ game.tournament_name }} · M{{ game.number }} · {{ formatDate(game.played_at) }}
            </p>
            <p class="truncate">
              {{ game.team_name }} <span class="text-muted">contre</span> {{ game.opponent_name }}
            </p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <span
              class="rounded px-1.5 py-0.5 text-xs font-bold"
              :class="
                game.score_for > game.score_against
                  ? 'bg-winner/15 text-winner'
                  : 'bg-loser/15 text-loser'
              "
            >
              {{ game.score_for > game.score_against ? 'V' : 'D' }}
            </span>
            <span class="display text-2xl tabular-nums">
              {{ game.score_for }}–{{ game.score_against }}
            </span>
          </div>
        </RouterLink>
      </section>
    </template>
  </main>
</template>
