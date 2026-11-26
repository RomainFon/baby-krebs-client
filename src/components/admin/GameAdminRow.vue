<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { updateGame, type GamePayload } from '@/api/tournaments'
import type { BestOf, Game, GameSet, PlayerRef, Slot, TournamentDetail } from '@/types'
import {
  gameTitle,
  isPlayed,
  isStarted,
  liveSets,
  slotLabel,
  STAGE_ACCENT,
  teamById,
} from '@/lib/tournament'
import { extractErrorMessage } from '@/lib/apiError'

const props = defineProps<{ tournament: TournamentDetail; game: Game }>()
const emit = defineEmits<{ saved: [detail: TournamentDetail] }>()

// Jour du match seulement : <input type="date"> et l'API parlent tous deux
// "AAAA-MM-JJ", aucune conversion de fuseau.

const scheduledAt = ref('')
const scoreA = ref<number | ''>('')
const scoreB = ref<number | ''>('')
const error = ref<string | null>(null)
const isSaving = ref(false)
const target = computed(() => props.tournament.target_score)
const teamsKnown = computed(() => props.game.team_a_id !== null && props.game.team_b_id !== null)

// ---- Format (BO1/BO3/BO5). En BO3/BO5, chaque manche se saisit comme un
// petit match à part (onglet par manche) : points, gardien de chaque
// équipe (il peut changer d'une manche à l'autre) et buteurs. Le résultat
// (manches gagnées) en découle ; les manches s'enregistrent au fur et à mesure.
type SetInput = { a: number | ''; b: number | ''; keeper_a: number | null; keeper_b: number | null }
const bestOf = ref<BestOf>(1)
const sets = ref<SetInput[]>([])
const multi = computed(() => bestOf.value > 1)
const toWin = computed(() => Math.floor(bestOf.value / 2) + 1)

function emptySet(): SetInput {
  return { a: '', b: '', keeper_a: null, keeper_b: null }
}

function setRows(game: Game, format: BestOf): SetInput[] {
  const saved = format === game.best_of ? (game.sets ?? []) : []
  return Array.from({ length: format }, (_, i) => {
    const s = saved[i]
    return s ? { a: s.a, b: s.b, keeper_a: s.keeper_a_id, keeper_b: s.keeper_b_id } : emptySet()
  })
}

const isFilled = (s: SetInput) => s.a !== '' || s.b !== ''
const filledSets = computed(() => sets.value.filter(isFilled))

function validSet(s: SetInput): s is SetInput & { a: number; b: number } {
  return (
    s.a !== '' &&
    s.b !== '' &&
    Math.max(s.a, s.b) === target.value &&
    Math.min(s.a, s.b) < target.value
  )
}

// Manches gagnées et index de la manche qui clôt le match (-1 tant qu'il
// n'est pas décidé) : les manches suivantes sont désactivées.
const setsTally = computed(() => {
  const won = { a: 0, b: 0 }
  let decidedAt = -1
  sets.value.forEach((s, i) => {
    if (decidedAt !== -1 || !validSet(s)) return
    won[s.a > s.b ? 'a' : 'b']++
    if (won.a === toWin.value || won.b === toWin.value) decidedAt = i
  })
  return { won, decidedAt }
})

/** Manche jouable : les précédentes sont saisies et le match n'est pas déjà gagné. */
function mancheOpen(i: number): boolean {
  const { decidedAt } = setsTally.value
  if (decidedAt !== -1 && i > decidedAt) return false
  return sets.value.slice(0, i).every(isFilled)
}

// Onglet ouvert : la première manche à saisir, sinon la dernière jouée.
const activeManche = ref(0)
function defaultManche(): number {
  const next = sets.value.findIndex((s, i) => !isFilled(s) && mancheOpen(i))
  return next !== -1 ? next : Math.max(0, filledSets.value.length - 1)
}

function changeFormat(format: BestOf) {
  bestOf.value = format
  sets.value = setRows(props.game, format)
  activeManche.value = 0
}

function setsPayload(): GameSet[] {
  return filledSets.value.map((s) => ({
    a: Number(s.a),
    b: Number(s.b),
    keeper_a_id: s.keeper_a,
    keeper_b_id: s.keeper_b,
  }))
}

const setsDirty = computed(
  () =>
    multi.value &&
    JSON.stringify(setsPayload()) !==
      JSON.stringify(
        (props.game.best_of === bestOf.value ? (props.game.sets ?? []) : []).map((s) => ({
          a: s.a,
          b: s.b,
          keeper_a_id: s.keeper_a_id,
          keeper_b_id: s.keeper_b_id,
        })),
      ),
)

// ---- Points et joueurs de chaque côté, pour la manche affichée (BO3/BO5)
// ou le match (BO1).
const current = computed(() => (multi.value ? sets.value[activeManche.value] : undefined))

const sides = computed(() =>
  (['a', 'b'] as const).map((slot) => {
    const team = teamById(
      props.tournament,
      slot === 'a' ? props.game.team_a_id : props.game.team_b_id,
    )
    return {
      slot,
      team,
      players: (team?.players ?? []) as PlayerRef[],
      // Points de la manche affichée (BO3/BO5) ou du match (BO1).
      score: current.value ? current.value[slot] : slot === 'a' ? scoreA.value : scoreB.value,
    }
  }),
)

function setScore(slot: Slot, raw: string) {
  const value = raw === '' ? '' : Number(raw)
  if (current.value) current.value[slot] = value
  else if (slot === 'a') scoreA.value = value
  else scoreB.value = value
}

// Raccourci : un clic sur "10" donne la manche (ou le match) à ce côté.
function setWinner(slot: Slot) {
  setScore(slot, String(target.value))
}

// ---- Buteurs (facultatif), manche par manche (une seule manche en BO1) :
// buts[manche][id du joueur].
type GoalInputs = Record<number, Record<number, number | ''>>
const goals = ref<GoalInputs>({})
const showDetails = ref(false)
const mancheNumber = computed(() => (multi.value ? activeManche.value + 1 : 1))

// Manches où l'on peut saisir des buteurs, avec les points de chaque côté.
const goalManches = computed<{ n: number; a: number | ''; b: number | '' }[]>(() =>
  multi.value
    ? sets.value.flatMap((s, i) => (isFilled(s) ? [{ n: i + 1, a: s.a, b: s.b }] : []))
    : [{ n: 1, a: scoreA.value, b: scoreB.value }],
)

function savedGoals(game: Game): GoalInputs {
  const result: GoalInputs = {}
  for (const g of game.goals) (result[g.manche] ??= {})[g.player_id] = g.goals
  return result
}

function goalValue(manche: number, playerId: number): number | '' | undefined {
  return goals.value[manche]?.[playerId]
}

function setGoal(playerId: number, raw: string) {
  const manche = mancheNumber.value
  const value = raw === '' ? '' : Number(raw)
  const row = (goals.value[manche] ??= {})
  row[playerId] = value
  // Saisir les buts d'un joueur complète ceux de son coéquipier (le reste de
  // ses points dans la manche) : en pratique, une saisie par équipe et par manche.
  const side = sides.value.find((s) => s.players.some((p) => p.id === playerId))
  if (!side || side.score === '' || value === '') return
  const partner = side.players.find((p) => p.id !== playerId)!
  row[partner.id] = Math.max(0, Number(side.score) - value)
}

// Comparaison sans les cases vides, pour ne pas voir de faux changements.
function normalized(inputs: GoalInputs): string {
  return JSON.stringify(
    Object.entries(inputs)
      .flatMap(([m, row]) =>
        Object.entries(row)
          .filter(([, v]) => v !== '' && v !== undefined)
          .map(([p, v]) => `${m}:${p}:${v}`),
      )
      .sort(),
  )
}

const goalsDirty = computed(() => normalized(goals.value) !== normalized(savedGoals(props.game)))

/** Lignes saisies : par manche et par équipe, seulement si un buteur est renseigné. */
function goalGroups() {
  return goalManches.value.flatMap((manche) =>
    sides.value.flatMap((side) => {
      const values = side.players.map((p) => goalValue(manche.n, p.id))
      if (!side.team || values.every((v) => v === '' || v === undefined)) return []
      return [{ manche, side, values }]
    }),
  )
}

function goalsPayload() {
  return goalGroups().flatMap(({ manche, side }) =>
    side.players.map((p) => ({
      player_id: p.id,
      manche: manche.n,
      goals: Number(goalValue(manche.n, p.id) || 0),
    })),
  )
}

// ---- Gardiens (obligatoires avec un score) : un joueur par équipe, son
// coéquipier est l'attaquant. BO1 : au niveau du match ; BO3/BO5 : dans
// chaque manche.
const keepers = ref<Record<Slot, number | null>>({ a: null, b: null })
const keeperKey = { a: 'keeper_a_id', b: 'keeper_b_id' } as const

function keeperOf(slot: Slot): number | null {
  if (current.value) return slot === 'a' ? current.value.keeper_a : current.value.keeper_b
  return keepers.value[slot]
}

function toggleKeeper(slot: Slot, playerId: number) {
  const next = keeperOf(slot) === playerId ? null : playerId
  if (current.value) current.value[slot === 'a' ? 'keeper_a' : 'keeper_b'] = next
  else keepers.value[slot] = next
}

const keepersDirty = computed(
  () =>
    !multi.value &&
    (keepers.value.a !== props.game.keeper_a_id || keepers.value.b !== props.game.keeper_b_id),
)

const hasScore = computed(() =>
  multi.value ? filledSets.value.length > 0 : scoreA.value !== '' && scoreB.value !== '',
)

// ---- Contrôles avant enregistrement, dans l'ordre où on les corrige.
const problem = computed(() => {
  if (multi.value) {
    let gap = false
    for (const [i, s] of sets.value.entries()) {
      const label = `Manche ${i + 1}`
      if (!isFilled(s)) {
        gap = true
        continue
      }
      if (gap) return `Saisis les manches dans l'ordre : la manche ${i} est vide.`
      if (setsTally.value.decidedAt !== -1 && i > setsTally.value.decidedAt)
        return `Le match est déjà gagné avant la manche ${i + 1}.`
      if (s.a === '' || s.b === '') return `${label} : saisis les deux scores.`
      if (!validSet(s)) return `${label} : une équipe doit avoir ${target.value}, l'autre moins.`
      if (s.keeper_a === null || s.keeper_b === null)
        return `${label} : indique le gardien de chaque équipe (🧤).`
    }
  } else {
    const anyKeeper = keepers.value.a !== null || keepers.value.b !== null
    if (anyKeeper && !hasScore.value) return 'Saisis le score avant les gardiens.'
    if (hasScore.value && (keepers.value.a === null || keepers.value.b === null))
      return 'Indique le gardien de chaque équipe (🧤).'
  }
  // Par manche et par équipe : le total des buteurs doit faire ses points.
  for (const { manche, side, values } of goalGroups()) {
    const where = multi.value ? ` (manche ${manche.n})` : ''
    const points = manche[side.slot]
    if (points === '') return `Saisis le score${where} avant les buteurs.`
    const total = values.reduce<number>((sum, v) => sum + Number(v || 0), 0)
    if (total !== Number(points))
      return `Buteurs de ${side.team!.name}${where} : ${total} but(s) pour ${points} point(s).`
  }
  return null
})

watch(
  () => props.game,
  (game) => {
    scheduledAt.value = game.scheduled_at ?? ''
    scoreA.value = game.score_a ?? ''
    scoreB.value = game.score_b ?? ''
    bestOf.value = game.best_of
    sets.value = setRows(game, game.best_of)
    goals.value = savedGoals(game)
    keepers.value = { a: game.keeper_a_id, b: game.keeper_b_id }
    // Après un enregistrement, on passe à la manche suivante à saisir.
    activeManche.value = defaultManche()
  },
  { immediate: true },
)

const dirty = computed(
  () =>
    scheduledAt.value !== (props.game.scheduled_at ?? '') ||
    bestOf.value !== props.game.best_of ||
    setsDirty.value ||
    (!multi.value &&
      (scoreA.value !== (props.game.score_a ?? '') ||
        scoreB.value !== (props.game.score_b ?? ''))) ||
    goalsDirty.value ||
    keepersDirty.value,
)

// BO1 : le gardien étant obligatoire, le panneau s'ouvre dès qu'un score est
// saisi sans gardien.
watch(
  () =>
    !multi.value &&
    hasScore.value &&
    (keepers.value.a === null || keepers.value.b === null) &&
    dirty.value,
  (needed) => {
    if (needed) showDetails.value = true
  },
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
    scheduled_at: scheduledAt.value || null,
  }
  if (bestOf.value !== props.game.best_of) payload.best_of = bestOf.value
  let scoreSent = false
  if (multi.value) {
    // Manches enregistrées au fur et à mesure (une seule suffit). Tout
    // vider revient à effacer le match.
    if (setsDirty.value) {
      if (filledSets.value.length) payload.sets = setsPayload()
      else Object.assign(payload, { score_a: null, score_b: null })
      scoreSent = filledSets.value.length > 0
    }
  } else {
    const scoreChanged =
      bestOf.value !== props.game.best_of ||
      scoreA.value !== (props.game.score_a ?? '') ||
      scoreB.value !== (props.game.score_b ?? '')
    if (scoreChanged && scoreA.value !== '' && scoreB.value !== '') {
      payload.score_a = Number(scoreA.value)
      payload.score_b = Number(scoreB.value)
      scoreSent = true
    }
    for (const slot of ['a', 'b'] as const) {
      if (keepers.value[slot] !== props.game[keeperKey[slot]]) {
        payload[keeperKey[slot]] = keepers.value[slot]
      }
    }
  }
  // Un score modifié efface les buteurs côté API : on renvoie donc la liste
  // dès que le score ou les buteurs changent.
  if (goalsDirty.value || scoreSent) {
    payload.goals = goalsPayload()
  }
  save(payload)
}

function clearScore() {
  if (confirm(`Effacer le score (et les manches) du match M${props.game.number} ?`))
    save({ score_a: null, score_b: null })
}

/** Libellé d'un onglet de manche : "10-3", ou vide. */
function mancheScore(s: SetInput): string {
  return isFilled(s) ? `${s.a === '' ? '?' : s.a}-${s.b === '' ? '?' : s.b}` : ''
}

const shortcutClass =
  'cursor-pointer rounded-full bg-surface-alt px-2 py-0.5 text-[10px] font-bold text-muted hover:bg-primary hover:text-primary-text'
</script>

<template>
  <div
    class="card flex flex-col gap-2 px-3 py-2.5"
    :style="{ borderLeft: `3px solid ${STAGE_ACCENT[game.stage]}` }"
  >
    <div class="flex items-center justify-between gap-2 text-xs text-muted">
      <span>M{{ game.number }} · {{ gameTitle(tournament, game) }}</span>
      <span class="flex items-center gap-2">
        <!-- Format du match, figé une fois la première manche saisie. -->
        <span
          class="flex items-center gap-0.5 rounded-full bg-surface-alt p-0.5"
          role="group"
          aria-label="Format du match"
          :title="isStarted(game) ? 'Efface le score pour changer le format' : 'Format du match'"
        >
          <button
            v-for="format in [1, 3, 5] as const"
            :key="format"
            type="button"
            class="rounded-full px-2 py-0.5 text-[10px] font-bold disabled:cursor-not-allowed"
            :class="
              bestOf === format
                ? 'bg-primary text-primary-text'
                : 'text-muted enabled:cursor-pointer enabled:hover:text-text'
            "
            :aria-pressed="bestOf === format"
            :disabled="isStarted(game)"
            @click="changeFormat(format)"
          >
            BO{{ format }}
          </button>
        </span>
        <span v-if="isPlayed(game)" class="text-winner">Joué</span>
        <span v-else-if="liveSets(game)" class="text-primary"
          >En cours · {{ liveSets(game)!.a }}–{{ liveSets(game)!.b }}</span
        >
      </span>
    </div>

    <form class="flex flex-col gap-2" @submit.prevent="handleSave">
      <div class="flex flex-wrap items-center gap-2">
        <div class="flex min-w-0 flex-1 basis-64 items-center gap-2">
          <div class="flex min-w-0 flex-1 items-center justify-end gap-1.5">
            <span class="truncate text-sm" :class="game.team_a_id === null && 'italic text-muted'">
              {{ slotLabel(tournament, game, 'a') }}
            </span>
            <template v-if="!multi">
              <button
                v-if="teamsKnown"
                type="button"
                :class="shortcutClass"
                :title="`Victoire ${slotLabel(tournament, game, 'a')}`"
                @click="setWinner('a')"
              >
                {{ target }}
              </button>
              <input
                :value="scoreA"
                type="number"
                min="0"
                max="99"
                class="field w-14 px-2 py-1 text-center"
                :disabled="!teamsKnown"
                aria-label="Score équipe A"
                @input="setScore('a', ($event.target as HTMLInputElement).value)"
              />
            </template>
          </div>
          <span v-if="!multi" class="text-muted">–</span>
          <span
            v-else
            class="shrink-0 rounded-full bg-surface-alt px-3 py-1 text-sm font-bold tabular-nums"
            title="Manches gagnées"
          >
            {{ setsTally.won.a }} – {{ setsTally.won.b }}
          </span>
          <div class="flex min-w-0 flex-1 items-center gap-1.5">
            <template v-if="!multi">
              <input
                :value="scoreB"
                type="number"
                min="0"
                max="99"
                class="field w-14 px-2 py-1 text-center"
                :disabled="!teamsKnown"
                aria-label="Score équipe B"
                @input="setScore('b', ($event.target as HTMLInputElement).value)"
              />
              <button
                v-if="teamsKnown"
                type="button"
                :class="shortcutClass"
                :title="`Victoire ${slotLabel(tournament, game, 'b')}`"
                @click="setWinner('b')"
              >
                {{ target }}
              </button>
            </template>
            <span class="truncate text-sm" :class="game.team_b_id === null && 'italic text-muted'">
              {{ slotLabel(tournament, game, 'b') }}
            </span>
          </div>
        </div>
        <input
          v-model="scheduledAt"
          type="date"
          class="field w-auto px-2 py-1 text-sm"
          aria-label="Jour du match"
        />
        <button
          v-if="teamsKnown && !multi"
          type="button"
          class="btn-ghost py-1 text-xs"
          :class="
            (game.goals.length > 0 || game.keeper_a_id !== null || game.keeper_b_id !== null) &&
            'text-primary'
          "
          @click="showDetails = !showDetails"
        >
          ⚽ Buteurs · 🧤
        </button>
        <button type="submit" class="btn-primary py-1" :disabled="!dirty || isSaving || !!problem">
          Enregistrer
        </button>
        <button
          v-if="isStarted(game)"
          type="button"
          class="btn-ghost py-1 text-xs"
          :disabled="isSaving"
          @click="clearScore"
        >
          Effacer
        </button>
      </div>

      <!-- BO3/BO5 : un onglet par manche, chacune saisie comme un match. -->
      <div
        v-if="multi && teamsKnown"
        class="flex flex-wrap gap-1.5"
        role="tablist"
        aria-label="Manches"
      >
        <button
          v-for="(set, i) in sets"
          :key="i"
          type="button"
          role="tab"
          class="pill py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
          :class="activeManche === i && 'pill-active'"
          :aria-selected="activeManche === i"
          :disabled="!mancheOpen(i) && !isFilled(set)"
          @click="activeManche = i"
        >
          Manche {{ i + 1 }}
          <span v-if="mancheScore(set)" class="ml-1 tabular-nums opacity-70">
            {{ mancheScore(set) }}
          </span>
        </button>
      </div>

      <!-- Panneau de saisie : la manche ouverte (BO3/BO5) ou le détail du
           match (BO1, repliable). -->
      <div
        v-if="teamsKnown && (multi || showDetails)"
        class="flex flex-col gap-3 rounded-2xl bg-surface-alt/60 p-3"
      >
        <div v-if="multi" class="flex items-center justify-center gap-2">
          <span class="text-xs font-semibold text-muted">Manche {{ activeManche + 1 }}</span>
          <button
            type="button"
            :class="shortcutClass"
            :title="`Manche pour ${slotLabel(tournament, game, 'a')}`"
            @click="setWinner('a')"
          >
            {{ target }}
          </button>
          <input
            :value="current?.a ?? ''"
            type="number"
            min="0"
            max="99"
            class="field w-14 px-2 py-1 text-center"
            :aria-label="`Manche ${activeManche + 1}, score équipe A`"
            @input="setScore('a', ($event.target as HTMLInputElement).value)"
          />
          <span class="text-muted">–</span>
          <input
            :value="current?.b ?? ''"
            type="number"
            min="0"
            max="99"
            class="field w-14 px-2 py-1 text-center"
            :aria-label="`Manche ${activeManche + 1}, score équipe B`"
            @input="setScore('b', ($event.target as HTMLInputElement).value)"
          />
          <button
            type="button"
            :class="shortcutClass"
            :title="`Manche pour ${slotLabel(tournament, game, 'b')}`"
            @click="setWinner('b')"
          >
            {{ target }}
          </button>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <div v-for="side in sides" :key="side.slot" class="flex flex-col gap-1.5">
            <p class="text-xs font-semibold text-muted">
              {{ side.team?.name }}
              <span v-if="side.score !== ''">· {{ side.score }} buts</span>
            </p>
            <label
              v-for="player in side.players"
              :key="player.id"
              class="flex items-center justify-between gap-2 text-sm"
            >
              <span class="flex min-w-0 items-center gap-1.5">
                <button
                  type="button"
                  class="shrink-0 cursor-pointer rounded-full px-1.5 py-0.5 text-xs"
                  :class="
                    keeperOf(side.slot) === player.id
                      ? 'bg-primary text-primary-text'
                      : 'bg-surface opacity-40 hover:opacity-100'
                  "
                  :aria-pressed="keeperOf(side.slot) === player.id"
                  :title="`${player.name} gardien`"
                  @click.prevent="toggleKeeper(side.slot, player.id)"
                >
                  🧤
                </button>
                <span class="truncate">{{ player.name }}</span>
              </span>
              <input
                :value="goalValue(mancheNumber, player.id) ?? ''"
                type="number"
                min="0"
                max="99"
                class="field w-16 px-2 py-1 text-center"
                :aria-label="
                  multi
                    ? `Buts de ${player.name}, manche ${activeManche + 1}`
                    : `Buts de ${player.name}`
                "
                @input="setGoal(player.id, ($event.target as HTMLInputElement).value)"
              />
            </label>
          </div>
        </div>
        <p class="text-xs text-muted">
          🧤 obligatoire : le gardien de chaque équipe<template v-if="multi">
            dans cette manche (il peut changer d'une manche à l'autre)</template
          >, son coéquipier est l'attaquant. Buteurs facultatifs : les buts d'un joueur complètent
          automatiquement ceux de son coéquipier.
          <template v-if="multi">
            Chaque manche peut être enregistrée dès qu'elle est jouée.</template
          >
        </p>
      </div>
    </form>
    <p v-if="problem && (showDetails || multi || dirty)" class="text-xs text-danger">
      {{ problem }}
    </p>
    <p v-if="error" class="text-xs text-danger">{{ error }}</p>
  </div>
</template>
