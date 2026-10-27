<script setup lang="ts">
import TeamBadge from '@/components/TeamBadge.vue'
import { computed } from 'vue'
import type { Game, TournamentDetail } from '@/types'
import { gameTitle, slotLabel, teamById } from '@/lib/tournament'

// Affiche d'un match façon maquette : bloc lime "Équipe VS Équipe", puis
// bloc blanc avec la phase, l'heure en grand et la date.
const props = defineProps<{ tournament: TournamentDetail; game: Game }>()
defineEmits<{ open: [game: Game] }>()

const date = computed(() => (props.game.scheduled_at ? new Date(props.game.scheduled_at) : null))
const time = computed(() =>
  date.value
    ? date.value.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '--:--',
)
const day = computed(() =>
  date.value
    ? date.value.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    : 'Date à définir',
)
</script>

<template>
  <button type="button" class="group w-full cursor-pointer text-left" @click="$emit('open', game)">
    <div
      class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-t-3xl bg-primary px-5 py-6 text-primary-text"
    >
      <div class="flex flex-col items-center gap-2 text-center">
        <TeamBadge :team="teamById(tournament, game.team_a_id)" size="lg" />
        <p class="display text-2xl break-words sm:text-3xl">
          {{ slotLabel(tournament, game, 'a') }}
        </p>
      </div>
      <span
        class="flex h-14 w-14 items-center justify-center rounded-full bg-ink font-display text-xl text-text transition-transform group-hover:scale-110"
      >
        VS
      </span>
      <div class="flex flex-col items-center gap-2 text-center">
        <TeamBadge :team="teamById(tournament, game.team_b_id)" size="lg" />
        <p class="display text-2xl break-words sm:text-3xl">
          {{ slotLabel(tournament, game, 'b') }}
        </p>
      </div>
    </div>
    <div class="grid grid-cols-3 items-center gap-2 rounded-b-3xl bg-paper px-5 py-4 text-ink">
      <p class="font-display text-sm leading-tight uppercase sm:text-base">
        {{ gameTitle(tournament, game) }}
      </p>
      <div class="text-center">
        <p class="display text-4xl sm:text-5xl">{{ time }}</p>
        <p class="text-xs text-ink/60">{{ day }}</p>
      </div>
      <p class="text-right font-display text-sm text-ink/50 uppercase sm:text-base">
        M{{ game.number }}
      </p>
    </div>
  </button>
</template>
