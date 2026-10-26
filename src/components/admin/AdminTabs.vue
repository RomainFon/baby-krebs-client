<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()

const TABS = [
  { label: 'Tournois', name: 'admin' },
  { label: 'Joueurs', name: 'admin-players' },
]
</script>

<template>
  <nav class="flex gap-1.5 overflow-x-auto rounded-full bg-surface p-1.5 sm:w-fit">
    <RouterLink
      v-for="tab in TABS"
      :key="tab.name"
      :to="{ name: tab.name }"
      class="pill flex-1 sm:flex-none sm:px-6"
      :class="route.name === tab.name && 'pill-active'"
    >
      {{ tab.label }}
    </RouterLink>
  </nav>
</template>
