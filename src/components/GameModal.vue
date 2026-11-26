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
  liveSets,
  placeholderLabel,
  setsLabel,
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
        // Toutes manches confondues.
        goals: game.goals.some((g) => g.player_id === p.id)
          ? game.goals.filter((g) => g.player_id === p.id).reduce((sum, g) => sum + g.goals, 0)
          : null,
        // Gardien du match (BO1) ; en BO3/BO5, nombre de manches gardées.
        keeper: (slot === 'a' ? game.keeper_a_id : game.keeper_b_id) === p.id,
        keeperManches:
          game.best_of > 1
            ? (game.sets ?? []).filter(
                (s) => (slot === 'a' ? s.keeper_a_id : s.keeper_b_id) === p.id,
              ).length
            : 0,
      })),
    }
  })
})

// BO3/BO5 : chaque manche avec ses points, son gardien de chaque côté et
// les buts de chaque joueur (joueurs gardiens ou buteurs saisis).
const manches = computed(() => {
  const game = props.game
  if (!game || game.best_of === 1 || !game.sets?.length) return []
  return game.sets.map((set, i) => ({
    n: i + 1,
    set,
    scorers: Object.fromEntries(
      sides.value.map((side) => [
        side.slot,
        side.players.flatMap((p) => {
          const entry = game.goals.find((g) => g.player_id === p.id && g.manche === i + 1)
          const keeper = (side.slot === 'a' ? set.keeper_a_id : set.keeper_b_id) === p.id
          return entry || keeper ? [{ name: p.name, goals: entry?.goals ?? null, keeper }] : []
        }),
      ]),
    ) as Record<Slot, { name: string; goals: number | null; keeper: boolean }[]>,
  }))
})
</script>

<template>
  <AppModal
    :open="game !== null"
    :title="game ? gameTitle(tournament, game) : ''"
    :subtitle="
      game
        ? `M${game.number} · ${STAGE_LABELS[game.stage]}${game.best_of > 1 ? ` · BO${game.best_of}` : ''}`
        : ''
    "
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
                <span v-if="p.keeper" title="Gardien" class="ml-0.5">🧤</span>
                <span
                  v-else-if="p.keeperManches"
                  :title="`Gardien sur ${p.keeperManches} manche(s)`"
                  class="ml-0.5"
                  >🧤<sup v-if="game.sets!.length > 1">{{ p.keeperManches }}</sup></span
                >
              </li>
            </ul>
          </div>
        </template>
        <div class="order-2 flex flex-col items-center gap-1">
          <p class="display text-6xl tabular-nums">
            <template v-if="isPlayed(game)">{{ game.score_a }}:{{ game.score_b }}</template>
            <template v-else-if="liveSets(game)"
              >{{ liveSets(game)!.a }}:{{ liveSets(game)!.b }}</template
            >
            <span
              v-else
              class="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-xl ring-1 ring-line"
            >
              VS
            </span>
          </p>
          <!-- BO3/BO5 : score = manches gagnées, détail des points en dessous. -->
          <p v-if="setsLabel(game)" class="text-xs text-muted tabular-nums">
            {{ setsLabel(game) }}
          </p>
          <p v-else-if="game.best_of > 1" class="text-xs text-muted">
            En {{ game.best_of }} manches max.
          </p>
        </div>
      </div>

      <!-- BO3/BO5 : détail manche par manche, buts de chaque joueur. -->
      <div v-if="manches.length" class="flex flex-col gap-1.5">
        <p class="text-xs font-semibold tracking-wide text-muted uppercase">Manche par manche</p>
        <div
          v-for="m in manches"
          :key="m.n"
          class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl bg-surface-alt px-3 py-2 text-xs"
        >
          <p class="flex flex-wrap justify-end gap-x-2 text-right text-muted">
            <span v-for="s in m.scorers.a" :key="s.name">
              <span v-if="s.keeper" title="Gardien de la manche">🧤</span>{{ s.name }}
              <span v-if="s.goals !== null" class="font-semibold text-text">{{ s.goals }}</span>
            </span>
          </p>
          <p class="flex flex-col items-center">
            <span class="text-[10px] text-muted">M{{ m.n }}</span>
            <span class="font-display text-base tabular-nums">
              <span :class="m.set.a > m.set.b ? 'text-primary' : 'text-muted'">{{ m.set.a }}</span
              >–<span :class="m.set.b > m.set.a ? 'text-primary' : 'text-muted'">{{
                m.set.b
              }}</span>
            </span>
          </p>
          <p class="flex flex-wrap gap-x-2 text-muted">
            <span v-for="s in m.scorers.b" :key="s.name">
              <span v-if="s.keeper" title="Gardien de la manche">🧤</span>{{ s.name }}
              <span v-if="s.goals !== null" class="font-semibold text-text">{{ s.goals }}</span>
            </span>
          </p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div
          class="rounded-2xl px-4 py-3"
          :class="isPlayed(game) ? 'bg-primary text-primary-text' : 'bg-surface-alt'"
        >
          <p class="text-xs opacity-70">Statut</p>
          <p class="font-display text-lg uppercase">
            {{ isPlayed(game) ? 'Terminé' : liveSets(game) ? 'En cours' : 'À venir' }}
          </p>
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
