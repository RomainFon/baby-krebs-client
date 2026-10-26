<script setup lang="ts">
import { computed } from 'vue'
import type { Game, Slot, TournamentDetail } from '@/types'
import { formatDate, loserDestination, slotLabel, STAGE_ACCENT, winnerSlot } from '@/lib/tournament'

const props = defineProps<{
  tournament: TournamentDetail
  game: Game
  highlightTeamId?: number | null
  showLoserDestination?: boolean
}>()
defineEmits<{ open: [game: Game] }>()

const winner = computed(() => winnerSlot(props.game))
const involved = computed(
  () =>
    props.highlightTeamId != null &&
    (props.game.team_a_id === props.highlightTeamId ||
      props.game.team_b_id === props.highlightTeamId),
)
const dimmed = computed(() => props.highlightTeamId != null && !involved.value)
const destination = computed(() =>
  props.showLoserDestination && props.game.stage === 'winner'
    ? loserDestination(props.tournament, props.game)
    : null,
)

const rows = computed(() =>
  (['a', 'b'] as Slot[]).map((slot) => ({
    slot,
    teamId: slot === 'a' ? props.game.team_a_id : props.game.team_b_id,
    label: slotLabel(props.tournament, props.game, slot),
    score: slot === 'a' ? props.game.score_a : props.game.score_b,
  })),
)
</script>

<template>
  <button
    type="button"
    class="group w-full cursor-pointer text-left transition-opacity"
    :class="dimmed ? 'opacity-25' : 'opacity-100'"
    @click="$emit('open', game)"
  >
    <div class="mb-1 flex items-center justify-between gap-2 px-1 text-[11px] text-muted">
      <span>M{{ game.number }}</span>
      <span>{{
        game.played_at || game.scheduled_at ? formatDate(game.scheduled_at ?? game.played_at) : ''
      }}</span>
    </div>
    <div
      class="overflow-hidden rounded-lg border bg-surface transition-colors group-hover:bg-surface-alt"
      :class="involved ? 'border-primary ring-1 ring-primary' : 'border-line'"
      :style="{ borderLeft: `3px solid ${STAGE_ACCENT[game.stage]}` }"
    >
      <div
        v-for="row in rows"
        :key="row.slot"
        class="flex items-center justify-between gap-2 px-3 py-1.5 text-sm not-last:border-b not-last:border-line"
        :class="[
          winner === row.slot ? 'font-semibold text-text' : winner ? 'text-muted' : '',
          row.teamId === null ? 'italic text-muted' : '',
          highlightTeamId != null && row.teamId === highlightTeamId ? 'bg-primary/10' : '',
        ]"
      >
        <span class="truncate">{{ row.label }}</span>
        <span class="tabular-nums">{{ row.score ?? '' }}</span>
      </div>
    </div>
    <p v-if="destination" class="mt-1 px-1 text-[11px] text-loser">↘ Perdant → {{ destination }}</p>
  </button>
</template>
