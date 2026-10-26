<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'

defineProps<{
  emoji: string
  label: string
  value: string | number
  detail?: string
  to?: RouteLocationRaw
}>()
</script>

<template>
  <component
    :is="to ? RouterLink : 'div'"
    :to="to"
    class="card flex flex-col gap-1 p-4"
    :class="to && 'transition-colors hover:bg-surface-alt'"
  >
    <span class="text-xs text-muted">{{ emoji }} {{ label }}</span>
    <span class="truncate font-display text-xl font-extrabold">{{ value }}</span>
    <span v-if="detail" class="text-xs text-muted">{{ detail }}</span>
  </component>
</template>
