<script setup lang="ts">
// En-tête de page façon "Explore / LEAGUES" : sur-titre léger + gros titre
// condensé. Le slot sert aux éléments à droite (badge, bouton...).
defineProps<{ kicker?: string; title: string; size?: 'xl' | 'lg' }>()
</script>

<template>
  <header class="flex flex-wrap items-end justify-between gap-4">
    <div class="min-w-0">
      <p v-if="kicker" class="kicker">{{ kicker }}</p>
      <h1
        class="display break-words"
        :class="size === 'lg' ? 'text-4xl sm:text-6xl' : 'text-6xl sm:text-8xl'"
      >
        {{ title }}
      </h1>
    </div>
    <slot />
  </header>
</template>
