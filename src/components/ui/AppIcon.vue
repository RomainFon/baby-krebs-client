<script setup lang="ts">
// Icônes au trait (style de la barre d'onglets de la maquette).
defineProps<{
  name:
    | 'home'
    | 'trophy'
    | 'users'
    | 'settings'
    | 'login'
    | 'logout'
    | 'arrow-left'
    | 'arrow-right'
    | 'play'
}>()
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'home'">
      <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />
    </template>
    <template v-else-if="name === 'trophy'">
      <path
        d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4"
      />
    </template>
    <template v-else-if="name === 'users'">
      <circle cx="9" cy="8.5" r="3.5" />
      <path
        d="M3 19.5c.6-3 3-4.5 6-4.5s5.4 1.5 6 4.5M16 5.2a3.4 3.4 0 0 1 0 6.6M17.5 15.2c1.8.6 3 2 3.5 4.3"
      />
    </template>
    <template v-else-if="name === 'settings'">
      <circle cx="12" cy="12" r="3" />
      <path
        d="M12 2.8 14 5l3-.4.8 2.9 2.6 1.6-1.1 2.9 1.1 2.9-2.6 1.6-.8 2.9-3-.4-2 2.2-2-2.2-3 .4-.8-2.9-2.6-1.6L4.7 12 3.6 9.1l2.6-1.6L7 4.6l3 .4z"
      />
    </template>
    <template v-else-if="name === 'login'">
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l4-4-4-4M14 12H4" />
    </template>
    <template v-else-if="name === 'logout'">
      <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 16l4-4-4-4M19 12H9" />
    </template>
    <template v-else-if="name === 'arrow-left'"><path d="M19 12H5M11 18l-6-6 6-6" /></template>
    <template v-else-if="name === 'arrow-right'"><path d="M5 12h14M13 6l6 6-6 6" /></template>
    <template v-else-if="name === 'play'">
      <path d="M8 5.5v13l10-6.5z" fill="currentColor" />
    </template>
  </svg>
</template>
