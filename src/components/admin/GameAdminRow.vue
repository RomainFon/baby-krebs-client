<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { updateGame, type GamePayload } from '@/api/tournaments'
import type { BestOf, Game, GameSet, PlayerRef, Slot, TournamentDetail } from '@/types'
import {
  gameTitle,
  isPlayed,
  isStarted,
  liveSets,
  setsLabel,
  slotLabel,
  STAGE_ACCENT,
  teamById,
} from '@/lib/tournament'
import { extractErrorMessage } from '@/lib/apiError'
import { plural } from '@/lib/format'
import TeamBadge from '@/components/TeamBadge.vue'

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
    // Après un enregistrement, on passe à la manche suivante à saisir et le
    // détail d'un match terminé se replie.
    activeManche.value = defaultManche()
    showDetails.value = false
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

// Panneau joueurs (gardien + buteurs) : toujours en BO3/BO5 (chaque
// manche s'y saisit), en BO1 dès qu'un score est saisi (gardien
// obligatoire) ou sur demande.
// Un match terminé se replie en résumé d'une ligne (« Modifier » le rouvre).
const detailsOpen = computed(() => {
  if (!teamsKnown.value) return false
  if (showDetails.value) return true
  if (isPlayed(props.game) && !dirty.value) return false
  return multi.value || hasScore.value
})

/** Résumé d'un match terminé : gardiens et buteurs (toutes manches). */
const summary = computed(() => {
  const game = props.game
  const name = (id: number | null) =>
    sides.value.flatMap((s) => s.players).find((p) => p.id === id)?.name
  const keeperIds =
    game.best_of > 1
      ? (game.sets ?? []).flatMap((s) => [s.keeper_a_id, s.keeper_b_id])
      : [game.keeper_a_id, game.keeper_b_id]
  const keepers = [...new Set(keeperIds)].map(name).filter(Boolean)
  const totals = new Map<number, number>()
  for (const g of game.goals) totals.set(g.player_id, (totals.get(g.player_id) ?? 0) + g.goals)
  const scorers = [...totals]
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id, n]) => `${name(id)} ${n}`)
  return { keepers: keepers.join(', '), scorers: scorers.join(', ') }
})

// Barre d'actions : seulement s'il y a quelque chose à enregistrer ou à effacer.
const showActions = computed(
  () => dirty.value || (isStarted(props.game) && (detailsOpen.value || !isPlayed(props.game))),
)

const scoreInput =
  'field h-12 w-12 px-0 text-center font-display text-2xl tabular-nums sm:h-14 sm:w-16 sm:text-3xl'
const smallScoreInput = 'field h-10 w-14 px-0 text-center font-display text-xl tabular-nums'
</script>

<template>
  <article
    class="card flex flex-col gap-4 p-4 sm:p-5"
    :class="!teamsKnown && 'opacity-70'"
    :style="{ borderLeft: `3px solid ${STAGE_ACCENT[game.stage]}` }"
  >
    <!-- En-tête : numéro et tour, statut, jour, format. -->
    <header class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex min-w-0 items-center gap-2 text-sm">
        <span class="rounded-full bg-surface-alt px-2.5 py-0.5 text-xs font-bold">
          M{{ game.number }}
        </span>
        <span class="truncate text-muted">{{ gameTitle(tournament, game) }}</span>
        <span
          v-if="isPlayed(game)"
          class="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary"
          >Joué</span
        >
        <span
          v-else-if="liveSets(game)"
          class="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary"
          >En cours</span
        >
      </div>
      <div class="flex items-center gap-2">
        <input
          v-model="scheduledAt"
          type="date"
          class="h-8 rounded-full border border-line bg-input px-3 text-xs text-muted outline-none focus:border-primary"
          aria-label="Jour du match"
        />
        <!-- Format du match, figé une fois la première manche saisie. -->
        <div
          class="flex items-center rounded-full bg-surface-alt p-0.5"
          role="group"
          aria-label="Format du match"
          :title="isStarted(game) ? 'Efface le score pour changer le format' : 'Format du match'"
        >
          <button
            v-for="format in [1, 3, 5] as const"
            :key="format"
            type="button"
            class="rounded-full px-2.5 py-1 text-[11px] font-bold disabled:cursor-not-allowed"
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
        </div>
      </div>
    </header>

    <form class="flex flex-col gap-4" @submit.prevent="handleSave">
      <!-- Tableau de score : équipe A · score · équipe B. -->
      <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
        <div
          v-for="side in sides"
          :key="side.slot"
          class="flex min-w-0 flex-col items-center gap-1.5 text-center sm:gap-2.5"
          :class="
            side.slot === 'a'
              ? 'order-1 sm:flex-row-reverse sm:text-right'
              : 'order-3 sm:flex-row sm:text-left'
          "
        >
          <TeamBadge :team="side.team" size="md" />
          <div
            class="flex max-w-full min-w-0 flex-col items-center"
            :class="side.slot === 'a' ? 'sm:items-end' : 'sm:items-start'"
          >
            <span
              class="max-w-full truncate text-sm font-semibold sm:text-base"
              :class="!side.team && 'font-normal text-muted italic'"
            >
              {{ slotLabel(tournament, game, side.slot) }}
            </span>
            <button
              v-if="teamsKnown && !multi"
              type="button"
              class="cursor-pointer text-[11px] font-medium text-muted hover:text-primary"
              @click="setWinner(side.slot)"
            >
              Victoire
            </button>
            <span v-else-if="multi && teamsKnown" class="text-[11px] text-muted">
              {{ plural(setsTally.won[side.slot], 'manche') }}
            </span>
          </div>
        </div>

        <div class="order-2 flex items-center gap-2">
          <template v-if="!teamsKnown">
            <span class="px-2 text-xs text-muted">En attente</span>
          </template>
          <template v-else-if="multi">
            <span class="display px-1 text-4xl tabular-nums">{{ setsTally.won.a }}</span>
            <span class="display text-2xl text-muted">:</span>
            <span class="display px-1 text-4xl tabular-nums">{{ setsTally.won.b }}</span>
          </template>
          <template v-else>
            <input
              :value="scoreA"
              type="number"
              min="0"
              max="99"
              inputmode="numeric"
              :class="scoreInput"
              :aria-label="`Score ${slotLabel(tournament, game, 'a')}`"
              @input="setScore('a', ($event.target as HTMLInputElement).value)"
            />
            <span class="display text-2xl text-muted">:</span>
            <input
              :value="scoreB"
              type="number"
              min="0"
              max="99"
              inputmode="numeric"
              :class="scoreInput"
              :aria-label="`Score ${slotLabel(tournament, game, 'b')}`"
              @input="setScore('b', ($event.target as HTMLInputElement).value)"
            />
          </template>
        </div>
      </div>

      <!-- Match terminé : résumé d'une ligne. -->
      <div
        v-if="teamsKnown && !detailsOpen && isPlayed(game)"
        class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted"
      >
        <span v-if="setsLabel(game)" class="tabular-nums">{{ setsLabel(game) }}</span>
        <span v-if="summary.keepers">🧤 {{ summary.keepers }}</span>
        <span v-if="summary.scorers">⚽ {{ summary.scorers }}</span>
        <button
          type="button"
          class="cursor-pointer font-semibold text-text hover:text-primary"
          @click="showDetails = true"
        >
          Modifier
        </button>
      </div>
      <!-- BO1 sans score : accès aux gardiens/buteurs à la demande. -->
      <button
        v-else-if="teamsKnown && !detailsOpen"
        type="button"
        class="self-center cursor-pointer text-xs text-muted hover:text-text"
        @click="showDetails = true"
      >
        🧤 Gardiens et ⚽ buteurs
      </button>

      <!-- Détail : manches (BO3/BO5), gardien et buteurs de chaque équipe. -->
      <div v-if="detailsOpen" class="flex flex-col gap-3 rounded-2xl bg-surface-alt/50 p-3 sm:p-4">
        <template v-if="multi">
          <div class="flex flex-wrap justify-center gap-1.5" role="tablist" aria-label="Manches">
            <button
              v-for="(set, i) in sets"
              :key="i"
              type="button"
              role="tab"
              class="pill py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-30"
              :class="activeManche === i && 'pill-active'"
              :aria-selected="activeManche === i"
              :disabled="!mancheOpen(i) && !isFilled(set)"
              @click="activeManche = i"
            >
              Manche {{ i + 1 }}
              <span v-if="mancheScore(set)" class="tabular-nums opacity-70">
                {{ mancheScore(set) }}
              </span>
            </button>
          </div>
          <div class="flex items-center justify-center gap-2">
            <button
              type="button"
              class="cursor-pointer text-[11px] font-medium text-muted hover:text-primary"
              @click="setWinner('a')"
            >
              Victoire {{ sides[0]?.team?.short_name }}
            </button>
            <input
              :value="current?.a ?? ''"
              type="number"
              min="0"
              max="99"
              inputmode="numeric"
              :class="smallScoreInput"
              :aria-label="`Manche ${activeManche + 1}, score ${slotLabel(tournament, game, 'a')}`"
              @input="setScore('a', ($event.target as HTMLInputElement).value)"
            />
            <span class="display text-lg text-muted">:</span>
            <input
              :value="current?.b ?? ''"
              type="number"
              min="0"
              max="99"
              inputmode="numeric"
              :class="smallScoreInput"
              :aria-label="`Manche ${activeManche + 1}, score ${slotLabel(tournament, game, 'b')}`"
              @input="setScore('b', ($event.target as HTMLInputElement).value)"
            />
            <button
              type="button"
              class="cursor-pointer text-[11px] font-medium text-muted hover:text-primary"
              @click="setWinner('b')"
            >
              Victoire {{ sides[1]?.team?.short_name }}
            </button>
          </div>
        </template>

        <div class="grid gap-4 sm:grid-cols-2">
          <div v-for="side in sides" :key="side.slot" class="flex flex-col gap-2.5">
            <p class="flex items-center gap-2 text-xs font-semibold">
              <TeamBadge :team="side.team" size="xs" />
              {{ side.team?.name }}
            </p>
            <!-- Gardien : un des deux joueurs (obligatoire). -->
            <div class="flex flex-col gap-1">
              <span class="text-[11px] text-muted">🧤 Gardien</span>
              <div class="grid grid-cols-2 gap-1 rounded-full bg-surface p-0.5">
                <button
                  v-for="player in side.players"
                  :key="player.id"
                  type="button"
                  class="cursor-pointer truncate rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
                  :class="
                    keeperOf(side.slot) === player.id
                      ? 'bg-primary text-primary-text'
                      : 'text-muted hover:text-text'
                  "
                  :aria-pressed="keeperOf(side.slot) === player.id"
                  @click="toggleKeeper(side.slot, player.id)"
                >
                  {{ player.name }}
                </button>
              </div>
            </div>
            <!-- Buteurs (facultatif). -->
            <div class="flex flex-col gap-1">
              <span class="text-[11px] text-muted">
                ⚽ Buts <span v-if="side.score !== ''">· {{ side.score }} au total</span>
              </span>
              <label
                v-for="player in side.players"
                :key="player.id"
                class="flex items-center justify-between gap-2 text-sm"
              >
                <span class="truncate">{{ player.name }}</span>
                <input
                  :value="goalValue(mancheNumber, player.id) ?? ''"
                  type="number"
                  min="0"
                  max="99"
                  inputmode="numeric"
                  placeholder="–"
                  class="field h-9 w-14 px-0 text-center"
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
        </div>
        <p class="text-[11px] text-muted">
          Le coéquipier du gardien joue en attaque. Les buts d'un joueur complètent automatiquement
          ceux de son coéquipier.
          <template v-if="multi">
            Le gardien peut changer à chaque manche ; enregistre chaque manche dès qu'elle est
            jouée.</template
          >
        </p>
      </div>

      <!-- Actions : message à gauche, boutons à droite. -->
      <footer v-if="showActions" class="flex flex-wrap items-center justify-end gap-2">
        <p v-if="error" class="mr-auto text-xs text-danger">{{ error }}</p>
        <p v-else-if="problem && dirty" class="mr-auto text-xs text-danger">{{ problem }}</p>
        <p v-else-if="dirty" class="mr-auto text-xs text-muted">Modifications non enregistrées</p>
        <button
          v-if="isStarted(game)"
          type="button"
          class="btn-ghost text-xs"
          :disabled="isSaving"
          @click="clearScore"
        >
          Effacer le score
        </button>
        <button type="submit" class="btn-primary" :disabled="!dirty || isSaving || !!problem">
          {{ isSaving ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
      </footer>
    </form>
  </article>
</template>
