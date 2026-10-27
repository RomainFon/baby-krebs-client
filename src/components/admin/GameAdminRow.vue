<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { updateGame, type GamePayload } from '@/api/tournaments'
import type { Game, TournamentDetail } from '@/types'
import { gameTitle, isPlayed, slotLabel, STAGE_ACCENT, teamById } from '@/lib/tournament'
import { extractErrorMessage } from '@/lib/apiError'

const props = defineProps<{ tournament: TournamentDetail; game: Game }>()
const emit = defineEmits<{ saved: [detail: TournamentDetail] }>()

// <input type="datetime-local"> travaille en heure locale sans fuseau :
// conversion explicite vers/depuis l'ISO UTC de l'API.
function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const scheduledAt = ref('')
const scoreA = ref<number | ''>('')
const scoreB = ref<number | ''>('')
const error = ref<string | null>(null)
const isSaving = ref(false)

// ---- Buteurs (facultatif) : buts de chaque joueur, par id de joueur.
const goals = ref<Record<number, number | ''>>({})
const showScorers = ref(false)

const sides = computed(() =>
  (['a', 'b'] as const).map((slot) => ({
    slot,
    team: teamById(props.tournament, slot === 'a' ? props.game.team_a_id : props.game.team_b_id),
    score: slot === 'a' ? scoreA.value : scoreB.value,
  })),
)

function savedGoals(game: Game): Record<number, number | ''> {
  return Object.fromEntries(game.goals.map((g) => [g.player_id, g.goals]))
}

// Saisir les buts d'un joueur complète ceux de son coéquipier (le reste du
// score de l'équipe) : en pratique, une seule saisie par équipe.
function onGoalInput(playerId: number) {
  const side = sides.value.find((s) => s.team?.players.some((p) => p.id === playerId))
  const value = goals.value[playerId]
  if (!side?.team || side.score === '' || value === '' || value === undefined) return
  const partner = side.team.players.find((p) => p.id !== playerId)!
  goals.value[partner.id] = Math.max(0, Number(side.score) - Number(value))
}

const goalsDirty = computed(
  () => JSON.stringify(goals.value) !== JSON.stringify(savedGoals(props.game)),
)

// Équipes dont au moins un buteur est renseigné : leur total doit faire le score.
const goalsProblem = computed(() => {
  for (const side of sides.value) {
    if (!side.team) continue
    const values = side.team.players.map((p) => goals.value[p.id])
    if (values.every((v) => v === '' || v === undefined)) continue
    if (side.score === '') return 'Saisis le score avant les buteurs.'
    const total = values.reduce<number>(
      (sum, v) => sum + (v === '' || v === undefined ? 0 : Number(v)),
      0,
    )
    if (total !== Number(side.score)) {
      return `Buteurs de ${side.team.name} : ${total} but(s) pour un score de ${side.score}.`
    }
  }
  return null
})

function goalsPayload() {
  return sides.value.flatMap((side) => {
    if (!side.team) return []
    const values = side.team.players.map((p) => goals.value[p.id])
    if (values.every((v) => v === '' || v === undefined)) return []
    return side.team.players.map((p) => ({
      player_id: p.id,
      goals: Number(goals.value[p.id] || 0),
    }))
  })
}

watch(
  () => props.game,
  (game) => {
    scheduledAt.value = toLocalInput(game.scheduled_at)
    scoreA.value = game.score_a ?? ''
    scoreB.value = game.score_b ?? ''
    goals.value = savedGoals(game)
  },
  { immediate: true },
)

const teamsKnown = computed(() => props.game.team_a_id !== null && props.game.team_b_id !== null)
const dirty = computed(
  () =>
    scheduledAt.value !== toLocalInput(props.game.scheduled_at) ||
    scoreA.value !== (props.game.score_a ?? '') ||
    scoreB.value !== (props.game.score_b ?? '') ||
    goalsDirty.value,
)

async function save(payload: GamePayload) {
  error.value = null
  isSaving.value = true
  try {
    emit('saved', await updateGame(props.game.id, payload))
  } catch (e) {
    error.value = extractErrorMessage(e, "Impossible d'enregistrer.")
  } finally {
    isSaving.value = false
  }
}

function handleSave() {
  const payload: GamePayload = {
    scheduled_at: scheduledAt.value ? new Date(scheduledAt.value).toISOString() : null,
  }
  const scoreChanged =
    scoreA.value !== (props.game.score_a ?? '') || scoreB.value !== (props.game.score_b ?? '')
  if (scoreChanged && scoreA.value !== '' && scoreB.value !== '') {
    payload.score_a = Number(scoreA.value)
    payload.score_b = Number(scoreB.value)
  }
  // Un score modifié efface les buteurs côté API : on renvoie donc la liste
  // dès que le score ou les buteurs changent.
  if (goalsDirty.value || (scoreChanged && payload.score_a !== undefined)) {
    payload.goals = goalsPayload()
  }
  save(payload)
}

function clearScore() {
  if (confirm(`Effacer le score du match M${props.game.number} ?`))
    save({ score_a: null, score_b: null })
}

// Raccourci : un clic sur "10" donne la victoire à ce côté.
function setWinner(slot: 'a' | 'b') {
  if (slot === 'a') scoreA.value = props.tournament.target_score
  else scoreB.value = props.tournament.target_score
}
</script>

<template>
  <div
    class="card flex flex-col gap-2 px-3 py-2.5"
    :style="{ borderLeft: `3px solid ${STAGE_ACCENT[game.stage]}` }"
  >
    <div class="flex items-center justify-between gap-2 text-xs text-muted">
      <span>M{{ game.number }} · {{ gameTitle(tournament, game) }}</span>
      <span v-if="isPlayed(game)" class="text-winner">Joué</span>
    </div>
    <form class="flex flex-wrap items-center gap-2" @submit.prevent="handleSave">
      <div class="flex min-w-0 flex-1 basis-64 items-center gap-2">
        <div class="flex min-w-0 flex-1 items-center justify-end gap-1.5">
          <span class="truncate text-sm" :class="game.team_a_id === null && 'italic text-muted'">
            {{ slotLabel(tournament, game, 'a') }}
          </span>
          <button
            v-if="teamsKnown"
            type="button"
            class="cursor-pointer rounded-full bg-surface-alt px-2 py-0.5 text-[10px] font-bold text-muted hover:bg-primary hover:text-primary-text"
            :title="`Victoire ${slotLabel(tournament, game, 'a')}`"
            @click="setWinner('a')"
          >
            {{ tournament.target_score }}
          </button>
          <input
            v-model.number="scoreA"
            type="number"
            min="0"
            max="99"
            class="field w-14 px-2 py-1 text-center"
            :disabled="!teamsKnown"
            aria-label="Score équipe A"
          />
        </div>
        <span class="text-muted">–</span>
        <div class="flex min-w-0 flex-1 items-center gap-1.5">
          <input
            v-model.number="scoreB"
            type="number"
            min="0"
            max="99"
            class="field w-14 px-2 py-1 text-center"
            :disabled="!teamsKnown"
            aria-label="Score équipe B"
          />
          <button
            v-if="teamsKnown"
            type="button"
            class="cursor-pointer rounded-full bg-surface-alt px-2 py-0.5 text-[10px] font-bold text-muted hover:bg-primary hover:text-primary-text"
            :title="`Victoire ${slotLabel(tournament, game, 'b')}`"
            @click="setWinner('b')"
          >
            {{ tournament.target_score }}
          </button>
          <span class="truncate text-sm" :class="game.team_b_id === null && 'italic text-muted'">
            {{ slotLabel(tournament, game, 'b') }}
          </span>
        </div>
      </div>
      <input
        v-model="scheduledAt"
        type="datetime-local"
        class="field w-auto px-2 py-1 text-sm"
        aria-label="Date du match"
      />
      <button
        v-if="teamsKnown"
        type="button"
        class="btn-ghost py-1 text-xs"
        :class="game.goals.length > 0 && 'text-primary'"
        @click="showScorers = !showScorers"
      >
        ⚽ Buteurs
      </button>
      <button
        type="submit"
        class="btn-primary py-1"
        :disabled="!dirty || isSaving || !!goalsProblem"
      >
        Enregistrer
      </button>
      <button
        v-if="isPlayed(game)"
        type="button"
        class="btn-ghost py-1 text-xs"
        :disabled="isSaving"
        @click="clearScore"
      >
        Effacer
      </button>
    </form>
    <div
      v-if="showScorers && teamsKnown"
      class="grid gap-3 rounded-2xl bg-surface-alt/60 p-3 sm:grid-cols-2"
    >
      <div v-for="side in sides" :key="side.slot" class="flex flex-col gap-1.5">
        <p class="text-xs font-semibold text-muted">
          {{ side.team?.name }} <span v-if="side.score !== ''">· {{ side.score }} buts</span>
        </p>
        <label
          v-for="player in side.team?.players ?? []"
          :key="player.id"
          class="flex items-center justify-between gap-2 text-sm"
        >
          <span class="truncate">{{ player.name }}</span>
          <input
            v-model.number="goals[player.id]"
            type="number"
            min="0"
            max="99"
            class="field w-16 px-2 py-1 text-center"
            :aria-label="`Buts de ${player.name}`"
            @input="onGoalInput(player.id)"
          />
        </label>
      </div>
      <p class="text-xs text-muted sm:col-span-2">
        Facultatif. Les buts d'un joueur complètent automatiquement ceux de son coéquipier.
      </p>
    </div>
    <p v-if="goalsProblem && showScorers" class="text-xs text-danger">{{ goalsProblem }}</p>
    <p v-if="error" class="text-xs text-danger">{{ error }}</p>
  </div>
</template>
