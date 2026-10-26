<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'

// Tuile de stat. Variantes "lime" et "paper" pour casser le noir, comme les
// blocs de pourcentages de la maquette.
defineProps<{
  emoji: string
  label: string
  value: string | number
  detail?: string
  to?: RouteLocationRaw
  variant?: 'dark' | 'lime' | 'paper'
}>()
</script>

<template>
  <component
    :is="to ? RouterLink : 'div'"
    :to="to"
    class="flex flex-col gap-3 rounded-3xl p-5 transition-transform"
    :class="[
      to && 'hover:-translate-y-0.5',
      variant === 'lime'
        ? 'bg-primary text-primary-text'
        : variant === 'paper'
          ? 'bg-paper text-ink'
          : 'bg-surface',
    ]"
  >
    <div class="flex items-center gap-2">
      <span
        class="flex h-9 w-9 items-center justify-center rounded-full text-lg"
        :class="variant && variant !== 'dark' ? 'bg-ink/10' : 'bg-surface-alt'"
      >
        {{ emoji }}
      </span>
      <span
        class="text-sm font-medium"
        :class="variant && variant !== 'dark' ? 'opacity-70' : 'text-muted'"
      >
        {{ label }}
      </span>
    </div>
    <span class="display truncate text-4xl">{{ value }}</span>
    <span
      v-if="detail"
      class="text-sm"
      :class="variant && variant !== 'dark' ? 'opacity-70' : 'text-muted'"
    >
      {{ detail }}
    </span>
  </component>
</template>
