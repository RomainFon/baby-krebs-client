<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AppModal from '@/components/ui/AppModal.vue'
import type { Game, Slot, TournamentDetail } from '@/types'
import {
  formatDate,
  gameTitle,
  isPlayed,
  placeholderLabel,
  STAGE_ACCENT,
  STAGE_LABELS,
  teamById,
  winnerSlot,
} from '@/lib/tournament'

const props = defineProps<{ tournament: TournamentDetail; game: Game | null }>()
const emit = defineEmits<{ close: [] }>()

const sides = computed(() => {
  const game = props.game
  if (!game) return []
  return (['a', 'b'] as Slot[]).map((slot) => {
    const team = teamById(props.tournament, slot === 'a' ? game.team_a_id : game.team_b_id)
    return {
      slot,
      team,
      placeholder: team ? null : placeholderLabel(props.tournament, game, slot),
      score: slot === 'a' ? game.score_a : game.score_b,
      won: winnerSlot(game) === slot,
    }
  })
})
</script>

<template>
  <AppModal
    :open="game !== null"
    :title="game ? `M${game.number} · ${gameTitle(tournament, game)}` : ''"
    :subtitle="game ? STAGE_LABELS[game.stage] : ''"
    :accent-color="game ? STAGE_ACCENT[game.stage] : null"
    @close="emit('close')"
  >
    <div v-if="game" class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <div
          v-for="side in sides"
          :key="side.slot"
          class="flex items-center justify-between gap-3 rounded-lg border px-4 py-3"
          :class="side.won ? 'border-primary/60 bg-primary/10' : 'border-line bg-background/40'"
        >
          <div class="min-w-0">
            <RouterLink
              v-if="side.team"
              :to="{ name: 'team', params: { tournamentId: tournament.id, teamId: side.team.id } }"
              class="block truncate font-semibold hover:underline"
              @click="emit('close')"
            >
              {{ side.team.name }}
            </RouterLink>
            <p v-else class="italic text-muted">{{ side.placeholder }}</p>
            <p v-if="side.team" class="truncate text-xs text-muted">
              {{ side.team.players.map((p) => p.name).join(' & ') }}
            </p>
          </div>
          <span
            class="font-display text-3xl font-extrabold tabular-nums"
            :class="side.won ? 'text-text' : 'text-muted'"
          >
            {{ side.score ?? '–' }}
          </span>
        </div>
      </div>

      <dl class="grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt class="text-xs text-muted">Statut</dt>
          <dd>{{ isPlayed(game) ? 'Terminé' : 'À venir' }}</dd>
        </div>
        <div>
          <dt class="text-xs text-muted">{{ isPlayed(game) ? 'Joué le' : 'Prévu' }}</dt>
          <dd>{{ formatDate(game.scheduled_at ?? game.played_at) }}</dd>
        </div>
      </dl>
    </div>
  </AppModal>
</template>
