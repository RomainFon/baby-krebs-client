<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { TournamentDetail } from '@/types'
import { parseRules } from '@/lib/rules'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ tournament: TournamentDetail }>()
const auth = useAuthStore()

const blocks = computed(() => parseRules(props.tournament.rules))
</script>

<template>
  <div class="flex flex-col gap-4">
    <div v-if="blocks.length === 0" class="card p-8 text-center">
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

    <article v-else class="card flex max-w-3xl flex-col gap-4 p-6 sm:p-8">
      <template v-for="(block, i) in blocks" :key="i">
        <h2 v-if="block.type === 'heading'" class="section-title mt-2 first:mt-0">
          {{ block.text }}
        </h2>
        <ul v-else-if="block.type === 'list'" class="flex flex-col gap-1.5">
          <li v-for="(item, j) in block.items" :key="j" class="flex gap-2.5 leading-relaxed">
            <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{{ item }}</span>
          </li>
        </ul>
        <p v-else class="leading-relaxed whitespace-pre-line text-text/90">{{ block.text }}</p>
      </template>
    </article>
  </div>
</template>
