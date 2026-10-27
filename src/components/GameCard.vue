<script setup lang="ts">
import TeamBadge from '@/components/TeamBadge.vue'
import { computed } from 'vue'
import type { Game, Slot, TournamentDetail } from '@/types'
import {
  formatDate,
  loserDestination,
  slotLabel,
  STAGE_ACCENT,
  teamById,
  teamTint,
  winnerSlot,
} from '@/lib/tournament'

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
// Couleur de l'équipe suivie : contour du match et fond de sa ligne.
const highlightColor = computed(
  () => teamById(props.tournament, props.highlightTeamId ?? null)?.color ?? null,
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
    team: teamById(props.tournament, slot === 'a' ? props.game.team_a_id : props.game.team_b_id),
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
    <div class="mb-1.5 flex items-center justify-between gap-2 px-1 text-[11px] text-muted">
      <span class="font-semibold">M{{ game.number }}</span>
      <span>{{
        game.played_at || game.scheduled_at ? formatDate(game.scheduled_at ?? game.played_at) : ''
      }}</span>
    </div>
    <div
      class="relative overflow-hidden rounded-2xl bg-surface transition-colors group-hover:bg-surface-alt"
      :class="!involved && game.stage === 'final' && 'ring-1 ring-primary/40'"
      :style="involved ? { boxShadow: `0 0 0 2px ${highlightColor}` } : undefined"
    >
      <span
        class="absolute inset-y-3 left-0 w-1 rounded-r-full"
        :style="{ background: STAGE_ACCENT[game.stage] }"
      />
      <div
        v-for="row in rows"
        :key="row.slot"
        class="flex items-center justify-between gap-2 py-2 pr-2 pl-4 text-sm"
        :class="[
          winner === row.slot ? 'font-semibold text-text' : winner ? 'text-muted' : '',
          row.teamId === null ? 'text-muted italic' : '',
        ]"
        :style="
          highlightTeamId != null && row.teamId === highlightTeamId
            ? { background: teamTint(highlightColor, 0.22) }
            : undefined
        "
      >
        <span class="flex min-w-0 items-center gap-2">
          <TeamBadge :team="row.team" size="xs" />
          <span class="truncate">{{ row.label }}</span>
        </span>
        <span
          v-if="row.score !== null"
          class="flex h-6 min-w-7 items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums"
          :class="
            winner === row.slot ? 'bg-primary text-primary-text' : 'bg-surface-alt text-muted'
          "
        >
          {{ row.score }}
        </span>
      </div>
    </div>
    <p v-if="destination" class="mt-1.5 px-1 text-[11px] text-muted">
      ↘ Perdant → {{ destination }}
    </p>
  </button>
</template>
