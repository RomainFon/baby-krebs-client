<script setup lang="ts">
import TeamBadge from '@/components/TeamBadge.vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import {
  createTeam,
  deleteTeam,
  deleteTeamLogo,
  uploadTeamLogo,
  deleteTournament,
  drawTournament,
  fetchPlayers,
  resetDraw,
  updateTeam,
  updateTournament,
  type TeamPayload,
} from '@/api/tournaments'
import { useTournamentStore } from '@/stores/tournament'
import { formatSummary, isPlayed, poolName, STATUS_LABELS } from '@/lib/tournament'
import { extractErrorMessage } from '@/lib/apiError'
import type { PlayerWithStats, Stage, Team, TournamentDetail } from '@/types'
import FormatFields from '@/components/admin/FormatFields.vue'
import TeamForm from '@/components/admin/TeamForm.vue'
import PlayerFormModal from '@/components/admin/PlayerFormModal.vue'
import PageTitle from '@/components/ui/PageTitle.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import GameAdminRow from '@/components/admin/GameAdminRow.vue'

const props = defineProps<{ tournamentId: number }>()
const router = useRouter()
const route = useRoute()
const store = useTournamentStore()

const tournament = computed(() => (store.current?.id === props.tournamentId ? store.current : null))
const isDraft = computed(() => tournament.value?.status === 'draft')
const hasScores = computed(() => tournament.value?.games.some(isPlayed) ?? false)

// ---- Onglets (gardés dans l'URL : ?onglet=equipes)
type Tab = 'infos' | 'equipes' | 'matchs'
const TABS: { key: Tab; label: string }[] = [
  { key: 'infos', label: 'Infos' },
  { key: 'equipes', label: 'Équipes' },
  { key: 'matchs', label: 'Matchs' },
]

// Sans onglet explicite, on ouvre celui qui sert à l'étape en cours :
// format d'abord, puis inscriptions, puis saisie des scores.
const tab = computed<Tab>(() => {
  const fromQuery = route.query.onglet
  if (TABS.some((t) => t.key === fromQuery)) return fromQuery as Tab
  if (!tournament.value || isDraft.value)
    return tournament.value?.teams.length ? 'equipes' : 'infos'
  return 'matchs'
})

const gamesToPlay = computed(
  () =>
    tournament.value?.games.filter(
      (g) => !isPlayed(g) && g.team_a_id !== null && g.team_b_id !== null,
    ).length ?? 0,
)

// Le bloc tirage n'apparaît que s'il y a une action possible : lancer le
// tirage (au moins 2 équipes inscrites), ou le refaire / l'annuler tant
// qu'aucun score n'est saisi.
const showDraw = computed(() =>
  isDraft.value ? (tournament.value?.teams.length ?? 0) >= 2 : !hasScores.value,
)

const players = ref<PlayerWithStats[]>([])
const error = ref<string | null>(null)
const busy = ref(false)

const settings = reactive({
  name: '',
  format: { group_count: 2, wb_per_group: 2, lb_per_group: 2, target_score: 10 },
})

const rules = ref('')
const rulesSaved = ref(false)

function syncSettings(t: TournamentDetail) {
  rules.value = t.rules ?? ''
  settings.name = t.name
  settings.format = {
    group_count: t.group_count,
    wb_per_group: t.wb_per_group,
    lb_per_group: t.lb_per_group,
    target_score: t.target_score,
  }
}

watch(
  () => props.tournamentId,
  async (id) => {
    await store.load(id)
    if (tournament.value) syncSettings(tournament.value)
  },
  { immediate: true },
)

onMounted(async () => {
  players.value = await fetchPlayers()
})

// Toutes les actions renvoient le tournoi complet : on remplace l'état.
async function run(action: () => Promise<TournamentDetail>, fallback: string): Promise<boolean> {
  error.value = null
  busy.value = true
  try {
    const detail = await action()
    store.replace(detail)
    return true
  } catch (e) {
    error.value = extractErrorMessage(e, fallback)
    return false
  } finally {
    busy.value = false
  }
}

async function saveSettings() {
  const payload = isDraft.value
    ? { name: settings.name, ...settings.format }
    : { name: settings.name }
  if (await run(() => updateTournament(props.tournamentId, payload), "Impossible d'enregistrer.")) {
    syncSettings(tournament.value!)
  }
}

async function saveRules() {
  rulesSaved.value = false
  const text = rules.value.trim()
  if (
    await run(
      () => updateTournament(props.tournamentId, { rules: text || null }),
      "Impossible d'enregistrer le règlement.",
    )
  ) {
    syncSettings(tournament.value!)
    rulesSaved.value = true
  }
}

// ---- Équipes
const addForm = ref<InstanceType<typeof TeamForm> | null>(null)
const editingTeamId = ref<number | null>(null)

const isCreatingPlayer = ref(false)

// Joueurs déjà engagés dans le tournoi (hors équipe en cours d'édition) :
// un joueur ne peut appartenir qu'à une seule équipe par tournoi.
function takenPlayers(exceptTeamId: number | null): Map<number, string> {
  const taken = new Map<number, string>()
  for (const team of tournament.value?.teams ?? []) {
    if (team.id === exceptTeamId) continue
    for (const p of team.players) taken.set(p.id, team.name)
  }
  return taken
}

async function onPlayerCreated() {
  players.value = await fetchPlayers()
}

async function addTeam(payload: TeamPayload) {
  if (await run(() => createTeam(props.tournamentId, payload), "Impossible d'ajouter l'équipe.")) {
    addForm.value?.reset()
  }
}

async function saveTeam(team: Team, payload: TeamPayload) {
  if (await run(() => updateTeam(team.id, payload), "Impossible de modifier l'équipe.")) {
    editingTeamId.value = null
  }
}

function onLogoSelected(team: Team, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) run(() => uploadTeamLogo(team.id, file), "Impossible d'envoyer le logo.")
}

function removeLogo(team: Team) {
  run(() => deleteTeamLogo(team.id), 'Impossible de retirer le logo.')
}

function removeTeam(team: Team) {
  if (confirm(`Supprimer l'équipe ${team.name} ?`))
    run(() => deleteTeam(team.id), 'Impossible de supprimer.')
}

// ---- Tirage
const formatError = computed(() =>
  tournament.value
    ? formatSummary(
        tournament.value.teams.length,
        tournament.value.group_count,
        tournament.value.wb_per_group,
        tournament.value.lb_per_group,
      ).error
    : null,
)

function draw() {
  const again = !isDraft.value
  if (again && !confirm('Refaire le tirage ? Les poules et les dates de matchs seront regénérées.'))
    return
  run(() => drawTournament(props.tournamentId), 'Tirage impossible.')
}

function cancelDraw() {
  if (confirm('Annuler le tirage ? Les poules et les matchs seront supprimés.'))
    run(() => resetDraw(props.tournamentId), "Impossible d'annuler le tirage.")
}

async function removeTournament() {
  if (
    !tournament.value ||
    !confirm(`Supprimer définitivement « ${tournament.value.name} » et tous ses matchs ?`)
  )
    return
  try {
    await deleteTournament(props.tournamentId)
    store.remove(props.tournamentId)
    router.replace({ name: 'admin' })
  } catch (e) {
    error.value = extractErrorMessage(e, 'Suppression impossible.')
  }
}

// ---- Matchs
const gameFilter = ref<'todo' | 'all'>('todo')
const STAGE_ORDER: Stage[] = ['group', 'winner', 'loser', 'final']
const STAGE_TITLES: Record<Stage, string> = {
  group: 'Poules',
  winner: 'Ligue des champions',
  loser: 'Ligue des espoirs',
  final: 'Grande finale',
}

const gameSections = computed(() => {
  const t = tournament.value
  if (!t) return []
  return STAGE_ORDER.map((stage) => ({
    stage,
    title: STAGE_TITLES[stage],
    games: t.games
      .filter((g) => g.stage === stage && (gameFilter.value === 'all' || !isPlayed(g)))
      .sort((a, b) => a.number - b.number),
  })).filter((s) => s.games.length > 0)
})
</script>

<template>
  <main class="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6">
    <RouterLink
      :to="{ name: 'admin' }"
      class="flex h-11 w-11 items-center justify-center rounded-full bg-surface-alt text-muted hover:text-text"
      aria-label="Tous les tournois"
    >
      <AppIcon name="arrow-left" class="h-5 w-5" />
    </RouterLink>

    <p v-if="!tournament" class="text-sm text-muted">{{ store.error ?? 'Chargement…' }}</p>

    <template v-else>
      <PageTitle
        :kicker="`Admin · ${STATUS_LABELS[tournament.status]}`"
        :title="tournament.name"
        size="lg"
      >
        <RouterLink
          :to="{ name: 'bracket', params: { tournamentId: tournament.id } }"
          class="btn-ghost"
        >
          Voir le tableau public →
        </RouterLink>
      </PageTitle>

      <p v-if="error" class="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
        {{ error }}
      </p>

      <nav class="flex gap-1.5 overflow-x-auto rounded-full bg-surface p-1.5 sm:w-fit">
        <RouterLink
          v-for="t in TABS"
          :key="t.key"
          :to="{ query: { onglet: t.key } }"
          replace
          class="pill flex-1 sm:flex-none sm:px-6"
          :class="tab === t.key && 'pill-active'"
        >
          {{ t.label }}
          <span
            v-if="t.key === 'equipes'"
            class="rounded-full bg-ink/20 px-1.5 text-[11px] tabular-nums"
          >
            {{ tournament.teams.length }}
          </span>
          <span
            v-if="t.key === 'matchs' && gamesToPlay"
            class="rounded-full bg-ink/20 px-1.5 text-[11px] tabular-nums"
          >
            {{ gamesToPlay }}
          </span>
        </RouterLink>
      </nav>

      <div v-if="tab === 'infos'" class="flex flex-col gap-6">
        <!-- Réglages -->
        <form class="card flex flex-col gap-4 p-6" @submit.prevent="saveSettings">
          <h2 class="section-title">Infos et format</h2>
          <label class="text-sm">
            <span class="mb-1 block text-muted">Nom</span>
            <input v-model="settings.name" required maxlength="100" class="field" />
          </label>
          <FormatFields
            v-model="settings.format"
            :team-count="tournament.teams.length"
            :disabled="!isDraft"
          />
          <p v-if="!isDraft" class="text-xs text-muted">
            Le format est figé depuis le tirage (annule-le pour le modifier).
          </p>
          <div>
            <button type="submit" class="btn-primary" :disabled="busy">Enregistrer</button>
          </div>
        </form>

        <!-- Règlement : affiché dans l'onglet public « Règlement ». -->
        <form class="card flex flex-col gap-3 p-6" @submit.prevent="saveRules">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <h2 class="section-title">Règlement</h2>
            <RouterLink
              :to="{ name: 'rules', params: { tournamentId: tournament.id } }"
              class="text-xs text-muted hover:text-text"
            >
              Voir la page publique →
            </RouterLink>
          </div>
          <textarea
            v-model="rules"
            rows="12"
            maxlength="20000"
            class="field font-mono text-sm leading-relaxed"
            placeholder="# Déroulement&#10;- Matchs en 10 points&#10;- Pas de roulette&#10;&#10;Texte libre…"
            @input="rulesSaved = false"
          />
          <p class="text-xs text-muted">
            Mise en forme : « # » en début de ligne pour un titre, « - » pour une liste, une ligne
            vide entre deux paragraphes.
          </p>
          <div class="flex items-center gap-3">
            <button type="submit" class="btn-primary" :disabled="busy">Enregistrer</button>
            <span v-if="rulesSaved" class="text-sm text-primary">Enregistré ✓</span>
          </div>
        </form>

        <section class="card flex flex-col gap-3 p-6 ring-1 ring-danger/30">
          <h2 class="section-title text-danger">Zone de danger</h2>
          <div>
            <button type="button" class="btn-danger" @click="removeTournament">
              Supprimer le tournoi
            </button>
          </div>
        </section>
      </div>

      <div v-else-if="tab === 'equipes'" class="flex flex-col gap-6">
        <!-- Tirage -->
        <section
          v-if="showDraw"
          class="flex flex-col gap-3 rounded-3xl bg-primary p-6 text-primary-text"
        >
          <h2 class="display text-3xl">Tirage au sort</h2>
          <template v-if="isDraft">
            <p class="text-sm opacity-70">
              Répartit les équipes au hasard dans les poules, puis génère tous les matchs de poule
              et l'arbre de la phase finale.
            </p>
            <p v-if="formatError" class="text-sm font-semibold">{{ formatError }}</p>
            <div>
              <button
                type="button"
                class="btn bg-ink text-text hover:bg-ink/85"
                :disabled="busy || !!formatError"
                @click="draw"
              >
                🎲 Lancer le tirage
              </button>
            </div>
          </template>
          <template v-else>
            <p class="text-sm opacity-70">
              Aucun score saisi : le tirage peut encore être refait ou annulé.
            </p>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="btn bg-ink text-text hover:bg-ink/85"
                :disabled="busy"
                @click="draw"
              >
                🎲 Refaire le tirage
              </button>
              <button
                type="button"
                class="btn bg-ink/10 hover:bg-ink/20"
                :disabled="busy"
                @click="cancelDraw"
              >
                Annuler le tirage
              </button>
            </div>
          </template>
        </section>

        <!-- Équipes -->
        <section class="card flex flex-col gap-4 p-6">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="section-title">Équipes ({{ tournament.teams.length }})</h2>
            <button type="button" class="btn-ghost py-1 text-xs" @click="isCreatingPlayer = true">
              + Créer un joueur
            </button>
          </div>
          <TeamForm
            v-if="isDraft"
            ref="addForm"
            submit-label="Ajouter"
            :busy="busy"
            :players="players"
            :taken="takenPlayers(null)"
            @submit="addTeam"
          />
          <p v-else class="text-xs text-muted">
            Tirage effectué : on peut encore renommer une équipe ou corriger un joueur, mais plus en
            ajouter.
          </p>

          <ul class="flex flex-col divide-y divide-line">
            <li v-for="team in tournament.teams" :key="team.id" class="py-2">
              <!-- Édition : nom, joueurs, couleur et logo (la couleur est
                   tirée au hasard à la création). -->
              <div v-if="editingTeamId === team.id" class="flex flex-col gap-3">
                <TeamForm
                  :initial="{
                    name: team.name,
                    players: [team.players[0].id, team.players[1].id],
                    color: team.color ?? '#444444',
                    short_name: team.short_name,
                  }"
                  submit-label="Enregistrer"
                  :busy="busy"
                  :players="players"
                  :taken="takenPlayers(team.id)"
                  @submit="saveTeam(team, $event)"
                  @cancel="editingTeamId = null"
                />
                <div class="flex flex-wrap items-center gap-3 rounded-2xl bg-surface-alt/60 p-3">
                  <TeamBadge :team="team" size="lg" />
                  <label class="btn-ghost cursor-pointer py-1 text-xs">
                    {{ team.logo_url ? 'Changer le logo' : 'Ajouter un logo' }}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      class="sr-only"
                      @change="onLogoSelected(team, $event)"
                    />
                  </label>
                  <button
                    v-if="team.logo_url"
                    type="button"
                    class="btn-ghost py-1 text-xs"
                    :disabled="busy"
                    @click="removeLogo(team)"
                  >
                    Retirer le logo
                  </button>
                  <span class="text-xs text-muted">PNG, JPG ou WEBP, 2 Mo max.</span>
                </div>
              </div>
              <div v-else class="flex items-center justify-between gap-3">
                <TeamBadge :team="team" size="md" />
                <div class="min-w-0 flex-1">
                  <p class="truncate font-medium">
                    {{ team.name }}
                    <span v-if="team.pool_id" class="ml-1 text-xs text-muted"
                      >· Poule {{ poolName(tournament, team.pool_id) }}</span
                    >
                  </p>
                  <p class="truncate text-sm text-muted">
                    {{ team.players.map((p) => p.name).join(' & ') }}
                  </p>
                </div>
                <div class="flex shrink-0 gap-2">
                  <button
                    type="button"
                    class="btn-ghost py-1 text-xs"
                    @click="editingTeamId = team.id"
                  >
                    Modifier
                  </button>
                  <button
                    v-if="isDraft"
                    type="button"
                    class="btn-danger py-1 text-xs"
                    @click="removeTeam(team)"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </li>
          </ul>
        </section>
      </div>

      <div v-else class="flex flex-col gap-6">
        <!-- Matchs -->
        <section v-if="tournament.games.length" class="flex flex-col gap-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="section-title">Matchs : dates et scores</h2>
            <div class="flex gap-1 text-xs">
              <button
                v-for="f in [
                  { key: 'todo', label: 'À jouer' },
                  { key: 'all', label: 'Tous' },
                ] as const"
                :key="f.key"
                type="button"
                class="pill py-1.5 text-xs"
                :class="gameFilter === f.key && 'pill-active'"
                @click="gameFilter = f.key"
              >
                {{ f.label }}
              </button>
            </div>
          </div>
          <p class="text-xs text-muted">
            Le gagnant (et le perdant, en Ligue des champions) avance automatiquement. Un score ne
            peut être corrigé que tant que le match suivant n'a pas été joué.
          </p>
          <p v-if="gameSections.length === 0" class="text-sm text-muted">
            Tous les matchs ont été joués 🎉
          </p>
          <div v-for="section in gameSections" :key="section.stage" class="flex flex-col gap-2">
            <h3 class="section-title">
              {{ section.title }}
            </h3>
            <GameAdminRow
              v-for="game in section.games"
              :key="game.id"
              :tournament="tournament"
              :game="game"
              @saved="store.replace"
            />
          </div>
        </section>

        <p v-if="tournament.games.length === 0" class="card p-5 text-sm text-muted">
          Les matchs seront générés au tirage au sort, depuis l'onglet
          <RouterLink :to="{ query: { onglet: 'equipes' } }" class="text-primary hover:underline"
            >Équipes</RouterLink
          >.
        </p>
      </div>
    </template>

    <PlayerFormModal
      :open="isCreatingPlayer"
      @close="isCreatingPlayer = false"
      @saved="onPlayerCreated"
    />
  </main>
</template>
