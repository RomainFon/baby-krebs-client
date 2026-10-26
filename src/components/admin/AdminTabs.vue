<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()

const TABS = [
  { label: 'Tournois', name: 'admin' },
  { label: 'Joueurs', name: 'admin-players' },
]
</script>

<template>
  <nav class="flex gap-1 rounded-lg border border-line bg-surface p-1 text-sm sm:w-fit">
    <RouterLink
      v-for="tab in TABS"
      :key="tab.name"
      :to="{ name: tab.name }"
      class="flex-1 rounded-md px-4 py-1.5 text-center sm:flex-none"
      :class="
        route.name === tab.name
          ? 'bg-surface-alt font-semibold text-text'
          : 'text-muted hover:text-text'
      "
    >
      {{ tab.label }}
    </RouterLink>
  </nav>
</template>
