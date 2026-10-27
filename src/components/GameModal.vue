<script setup lang="ts">
import TeamBadge from '@/components/TeamBadge.vue'
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
      // Joueurs avec leurs buts dans ce match (null si buteurs non saisis).
      players: (team?.players ?? []).map((p) => ({
        ...p,
        goals: game.goals.find((g) => g.player_id === p.id)?.goals ?? null,
      })),
    }
  })
})
</script>

<template>
  <AppModal
    :open="game !== null"
    :title="game ? gameTitle(tournament, game) : ''"
    :subtitle="game ? `M${game.number} · ${STAGE_LABELS[game.stage]}` : ''"
    :accent-color="game ? STAGE_ACCENT[game.stage] : null"
    @close="emit('close')"
  >
    <div v-if="game" class="flex flex-col gap-6">
      <!-- Affiche : équipe A · score · équipe B -->
      <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
        <template v-for="(side, i) in sides" :key="side.slot">
          <div class="flex min-w-0 flex-col items-center gap-1.5" :class="i === 1 && 'order-3'">
            <TeamBadge :team="side.team" size="lg" />
            <RouterLink
              v-if="side.team"
              :to="{ name: 'team', params: { tournamentId: tournament.id, teamId: side.team.id } }"
              class="display text-2xl break-words hover:text-primary"
              :class="isPlayed(game) && !side.won && 'text-muted'"
              @click="emit('close')"
            >
              {{ side.team.name }}
            </RouterLink>
            <p v-else class="text-sm text-muted italic">{{ side.placeholder }}</p>
            <ul v-if="side.team" class="flex flex-col items-center text-xs text-muted">
              <li v-for="p in side.players" :key="p.id">
                {{ p.name }}
                <span v-if="p.goals !== null" class="font-semibold text-text"
                  >· {{ p.goals }} ⚽</span
                >
              </li>
            </ul>
          </div>
        </template>
        <p class="order-2 display text-6xl tabular-nums">
          <template v-if="isPlayed(game)">{{ game.score_a }}:{{ game.score_b }}</template>
          <span
            v-else
            class="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-xl ring-1 ring-line"
          >
            VS
          </span>
        </p>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div
          class="rounded-2xl px-4 py-3"
          :class="isPlayed(game) ? 'bg-primary text-primary-text' : 'bg-surface-alt'"
        >
          <p class="text-xs opacity-70">Statut</p>
          <p class="font-display text-lg uppercase">{{ isPlayed(game) ? 'Terminé' : 'À venir' }}</p>
        </div>
        <div class="rounded-2xl bg-paper px-4 py-3 text-ink">
          <p class="text-xs opacity-60">{{ isPlayed(game) ? 'Joué le' : 'Prévu' }}</p>
          <p class="font-display text-lg uppercase">
            {{ formatDate(game.scheduled_at ?? game.played_at) }}
          </p>
        </div>
      </div>
    </div>
  </AppModal>
</template>
