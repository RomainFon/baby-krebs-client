<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { TournamentDetail } from '@/types'
import { poolName, teamStats, teamStatus } from '@/lib/tournament'

const props = defineProps<{ tournament: TournamentDetail }>()

const teams = computed(() =>
  props.tournament.teams.map((team) => ({
    team,
    stats: teamStats(props.tournament, team.id),
    status: teamStatus(props.tournament, team.id),
    pool: team.pool_id ? poolName(props.tournament, team.pool_id) : null,
  })),
)
</script>

<template>
  <div class="flex flex-col gap-4">
    <p v-if="teams.length === 0" class="text-sm text-muted">
      Aucune équipe inscrite pour l'instant.
    </p>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <RouterLink
        v-for="{ team, stats, status, pool } in teams"
        :key="team.id"
        :to="{ name: 'team', params: { tournamentId: tournament.id, teamId: team.id } }"
        class="card flex flex-col gap-3 p-4 transition-colors hover:bg-surface-alt"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <h2 class="truncate font-display text-lg font-extrabold">{{ team.name }}</h2>
            <p class="truncate text-sm text-muted">
              {{ team.players.map((p) => p.name).join(' & ') }}
            </p>
          </div>
          <span
            v-if="pool"
            class="shrink-0 rounded-full border border-line px-2 py-0.5 text-xs text-muted"
          >
            Poule {{ pool }}
          </span>
        </div>
        <dl class="grid grid-cols-4 gap-2 text-center">
          <div>
            <dt class="text-[11px] text-muted">J</dt>
            <dd class="font-semibold tabular-nums">{{ stats.played }}</dd>
          </div>
          <div>
            <dt class="text-[11px] text-muted">V</dt>
            <dd class="font-semibold tabular-nums text-winner">{{ stats.wins }}</dd>
          </div>
          <div>
            <dt class="text-[11px] text-muted">D</dt>
            <dd class="font-semibold tabular-nums text-loser">{{ stats.losses }}</dd>
          </div>
          <div>
            <dt class="text-[11px] text-muted">Buts</dt>
            <dd class="font-semibold tabular-nums">
              {{ stats.goals_for }}–{{ stats.goals_against }}
            </dd>
          </div>
        </dl>
        <p class="text-xs text-muted">{{ status }}</p>
      </RouterLink>
    </div>
  </div>
</template>
