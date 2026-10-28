<script setup lang="ts">
// Étiquette d'identité d'une équipe : pastille de sa couleur + diminutif.
defineProps<{ team: { short_name: string; color: string | null } }>()
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface-alt py-1 pr-3 pl-1.5 text-xs font-semibold tracking-wide"
    :title="`Diminutif : ${team.short_name}`"
  >
    <span
      class="h-4 w-4 rounded-full ring-2 ring-white/10"
      :style="{ background: team.color ?? '#444444' }"
      aria-hidden="true"
    />
    {{ team.short_name }}
  </span>
</template>
