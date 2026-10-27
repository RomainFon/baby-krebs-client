<script setup lang="ts">
import { computed } from 'vue'
import { formatSummary } from '@/lib/tournament'

// Réglages du format d'un tournoi, avec l'aperçu de la répartition.
const model = defineModel<{
  group_count: number
  wb_per_group: number
  lb_per_group: number
  target_score: number
}>({
  required: true,
})
const props = defineProps<{ teamCount: number | null; disabled?: boolean }>()

const summary = computed(() =>
  !props.teamCount
    ? null
    : formatSummary(
        props.teamCount,
        model.value.group_count,
        model.value.wb_per_group,
        model.value.lb_per_group,
      ),
)
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <label class="text-sm">
        <span class="mb-1 block text-muted">Poules</span>
        <input
          v-model.number="model.group_count"
          type="number"
          min="1"
          max="8"
          class="field"
          :disabled="disabled"
        />
      </label>
      <label class="text-sm">
        <span class="mb-1 block text-muted">→ Champions / poule</span>
        <input
          v-model.number="model.wb_per_group"
          type="number"
          min="1"
          max="8"
          class="field"
          :disabled="disabled"
        />
      </label>
      <label class="text-sm">
        <span class="mb-1 block text-muted">→ Espoirs / poule</span>
        <input
          v-model.number="model.lb_per_group"
          type="number"
          min="0"
          max="8"
          class="field"
          :disabled="disabled"
        />
      </label>
      <label class="text-sm">
        <span class="mb-1 block text-muted">Points pour gagner</span>
        <input
          v-model.number="model.target_score"
          type="number"
          min="1"
          max="99"
          class="field"
          :disabled="disabled"
        />
      </label>
    </div>
    <p class="text-xs text-muted">
      Dans chaque poule, les {{ model.wb_per_group }} premiers vont en Ligue des champions<template
        v-if="model.lb_per_group"
        >, les {{ model.lb_per_group }} suivants en Ligue des espoirs</template
      >, les autres sont éliminés.
    </p>
    <p v-if="summary" class="text-xs" :class="summary.error ? 'text-danger' : 'text-muted'">
      <template v-if="summary.error">{{ summary.error }}</template>
      <template v-else>
        Avec {{ teamCount }} équipes : {{ summary.wbTeams }} en Ligue des champions,
        {{ summary.lbTeams }} en Ligue des espoirs, {{ summary.eliminated }} éliminée(s) en poule.
      </template>
    </p>
  </div>
</template>
