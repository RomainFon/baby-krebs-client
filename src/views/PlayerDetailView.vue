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

const stats = computed(() => player.value?.stats ?? null)

// Bloc "Buts" : quatre chiffres côte à côte.
const goalFigures = computed(() => {
  const s = stats.value
  if (!s) return []
  return [
    { label: 'Marqués', value: s.goals_scored, hint: 'par le joueur' },
    { label: 'Équipe', value: s.goals_for, hint: 'avec son équipe' },
    { label: 'Encaissés', value: s.goals_against, hint: 'par son équipe' },
    { label: 'Différence', value: signed(s.goal_diff), hint: 'équipe' },
  ]
})

// Bloc "Postes" : attaque et défense (gardien), comptés manche par manche
// en BO3/BO5. Seulement les matchs où le gardien a été saisi.
const positions = computed(() => {
  const s = stats.value
  if (!s) return []
  const avg = (n: number, d: number) => (d ? (n / d).toFixed(1) : '–')
  return [
    {
      key: 'attack',
      emoji: '⚽',
      title: 'En attaque',
      played: s.games_as_attacker,
      wins: s.wins_as_attacker,
      rate: s.attacker_win_rate,
      figures: [
        { label: 'Buts', value: s.goals_scored_as_attacker },
        { label: 'Buts / match', value: avg(s.goals_scored_as_attacker, s.games_as_attacker) },
      ],
    },
    {
      key: 'keeper',
      emoji: '🧤',
      title: 'Au but',
      played: s.games_as_keeper,
      wins: s.wins_as_keeper,
      rate: s.keeper_win_rate,
      figures: [
        { label: 'Encaissés', value: s.goals_conceded_as_keeper },
        { label: 'Encaissés / match', value: avg(s.goals_conceded_as_keeper, s.games_as_keeper) },
        { label: 'Buts marqués', value: s.goals_scored_as_keeper },
      ],
    },
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

      <template v-if="stats">
        <!-- Bilan : % de victoires et barre V/D, titres, tournois. -->
        <section class="grid gap-3 sm:grid-cols-[2fr_1fr]">
          <div class="flex flex-col gap-4 rounded-3xl bg-primary p-5 text-primary-text">
            <div class="flex items-end justify-between gap-4">
              <div>
                <p class="text-xs opacity-60">% victoires</p>
                <p class="display text-6xl tabular-nums">
                  {{ stats.played ? percent(stats.win_rate) : '–' }}
                </p>
              </div>
              <p class="text-right text-sm font-medium opacity-70">
                {{ plural(stats.played, 'match', 'matchs') }}
              </p>
            </div>
            <div class="flex flex-col gap-1.5">
              <div class="flex h-2.5 overflow-hidden rounded-full bg-ink/15">
                <span
                  class="h-full rounded-full bg-ink"
                  :style="{ width: `${stats.played ? (stats.wins / stats.played) * 100 : 0}%` }"
                />
              </div>
              <p class="flex justify-between text-xs font-semibold">
                <span>{{ plural(stats.wins, 'victoire') }}</span>
                <span class="opacity-60">{{ plural(stats.losses, 'défaite') }}</span>
              </p>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-1">
            <div class="rounded-3xl bg-paper px-5 py-4 text-ink">
              <p class="text-xs opacity-60">Titres</p>
              <p class="display text-3xl tabular-nums">
                {{ stats.titles ? `🏆 ${stats.titles}` : '0' }}
              </p>
            </div>
            <div class="rounded-3xl bg-surface px-5 py-4">
              <p class="text-xs text-muted">Tournois</p>
              <p class="display text-3xl tabular-nums">{{ stats.tournaments }}</p>
            </div>
          </div>
        </section>

        <!-- Buts : perso, équipe, encaissés, différence (+ fannys). -->
        <section class="flex flex-col gap-3 rounded-3xl bg-surface p-5">
          <h2 class="section-title">Buts</h2>
          <dl class="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            <div v-for="f in goalFigures" :key="f.label">
              <dt class="text-xs text-muted">{{ f.label }}</dt>
              <dd class="display text-3xl tabular-nums">{{ f.value }}</dd>
              <p class="text-[11px] text-muted">{{ f.hint }}</p>
            </div>
          </dl>
          <p
            v-if="stats.fannys_given || stats.fannys_taken"
            class="border-t border-line pt-3 text-xs text-muted"
          >
            Fannys : {{ plural(stats.fannys_given, 'donnée') }} ·
            {{ plural(stats.fannys_taken, 'prise') }}
          </p>
        </section>

        <!-- Postes : attaque et défense côte à côte. -->
        <section class="flex flex-col gap-3">
          <h2 class="section-title">Postes</h2>
          <div class="grid gap-3 md:grid-cols-2">
            <article
              v-for="pos in positions"
              :key="pos.key"
              class="flex flex-col gap-4 rounded-3xl bg-surface p-5"
            >
              <header class="flex items-center justify-between gap-2">
                <span class="flex items-center gap-2">
                  <span
                    class="flex h-9 w-9 items-center justify-center rounded-full bg-surface-alt text-lg"
                    >{{ pos.emoji }}</span
                  >
                  <span class="font-semibold">{{ pos.title }}</span>
                </span>
                <span class="text-xs text-muted">{{ plural(pos.played, 'match', 'matchs') }}</span>
              </header>
              <p v-if="pos.played === 0" class="text-sm text-muted">Jamais joué à ce poste.</p>
              <template v-else>
                <div class="flex flex-col gap-1.5">
                  <p class="flex items-baseline justify-between gap-2">
                    <span class="display text-4xl tabular-nums">{{ percent(pos.rate) }}</span>
                    <span class="text-xs text-muted">{{ pos.wins }} V / {{ pos.played }}</span>
                  </p>
                  <div class="h-1.5 overflow-hidden rounded-full bg-surface-alt">
                    <span
                      class="block h-full rounded-full bg-primary"
                      :style="{ width: `${pos.rate * 100}%` }"
                    />
                  </div>
                </div>
                <dl class="grid grid-cols-3 gap-3 border-t border-line pt-3">
                  <div v-for="f in pos.figures" :key="f.label">
                    <dt class="text-[11px] text-muted">{{ f.label }}</dt>
                    <dd class="display text-2xl tabular-nums">{{ f.value }}</dd>
                  </div>
                </dl>
              </template>
            </article>
          </div>
          <p class="text-xs text-muted">
            Postes déduits du gardien saisi (son coéquipier est l'attaquant), comptés manche par
            manche en BO3/BO5.
          </p>
        </section>
      </template>

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
              v-if="game.goals_scored !== null"
              class="rounded-full bg-surface-alt px-2 py-0.5 text-xs font-semibold"
              title="Buts marqués par le joueur"
            >
              {{ game.goals_scored }} ⚽
            </span>
            <span
              v-if="game.keeper"
              class="rounded-full bg-surface-alt px-2 py-0.5 text-xs font-semibold"
              :title="
                game.keeper_manches !== null
                  ? `Gardien sur ${game.keeper_manches} manche(s) sur ${game.sets?.length ?? 0}`
                  : 'Gardien dans ce match'
              "
            >
              🧤<template v-if="game.keeper_manches !== null">
                {{ game.keeper_manches }}/{{ game.sets?.length ?? 0 }}</template
              >
            </span>
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
            <span class="flex flex-col items-end">
              <span class="display text-2xl tabular-nums">
                {{ game.score_for }}–{{ game.score_against }}
              </span>
              <!-- BO3/BO5 : score = manches, détail des points en dessous. -->
              <span v-if="game.sets" class="text-[10px] text-muted tabular-nums">
                {{ game.sets.map(([f, a]) => `${f}-${a}`).join(' · ') }}
              </span>
            </span>
          </div>
        </RouterLink>
      </section>
    </template>
  </main>
</template>
