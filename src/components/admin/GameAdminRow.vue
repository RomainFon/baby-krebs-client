<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { updateGame, type GamePayload } from '@/api/tournaments'
import type { Game, TournamentDetail } from '@/types'
import { gameTitle, isPlayed, slotLabel, STAGE_ACCENT } from '@/lib/tournament'
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

watch(
  () => props.game,
  (game) => {
    scheduledAt.value = toLocalInput(game.scheduled_at)
    scoreA.value = game.score_a ?? ''
    scoreB.value = game.score_b ?? ''
  },
  { immediate: true },
)

const teamsKnown = computed(() => props.game.team_a_id !== null && props.game.team_b_id !== null)
const dirty = computed(
  () =>
    scheduledAt.value !== toLocalInput(props.game.scheduled_at) ||
    scoreA.value !== (props.game.score_a ?? '') ||
    scoreB.value !== (props.game.score_b ?? ''),
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
            class="cursor-pointer rounded border border-line px-1 text-[10px] text-muted hover:text-text"
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
            class="cursor-pointer rounded border border-line px-1 text-[10px] text-muted hover:text-text"
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
      <button type="submit" class="btn-primary py-1" :disabled="!dirty || isSaving">
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
    <p v-if="error" class="text-xs text-danger">{{ error }}</p>
  </div>
</template>
