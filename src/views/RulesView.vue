<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { TournamentDetail } from '@/types'
import { renderRules } from '@/lib/rules'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ tournament: TournamentDetail }>()
const auth = useAuthStore()

// HTML sûr : voir lib/rules.ts (HTML brut désactivé).
const html = computed(() => renderRules(props.tournament.rules))
</script>

<template>
  <div class="flex flex-col gap-4">
    <div v-if="!html" class="card p-8 text-center">
      <p class="font-semibold">Pas encore de règlement pour ce tournoi.</p>
      <RouterLink
        v-if="auth.user"
        :to="{
          name: 'admin-tournament',
          params: { tournamentId: tournament.id },
          query: { onglet: 'infos' },
        }"
        class="btn-primary mt-4"
      >
        Rédiger le règlement
      </RouterLink>
    </div>

    <!-- eslint-disable-next-line vue/no-v-html -- Markdown rendu sans HTML brut -->
    <article v-else class="rules card max-w-3xl p-6 sm:p-8" v-html="html" />
  </div>
</template>
