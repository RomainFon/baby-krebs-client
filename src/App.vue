<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import AppNav from '@/components/AppNav.vue'

const route = useRoute()
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <AppNav v-if="route.meta.showNav !== false" />
    <!-- Marge basse sur mobile : place pour la barre d'onglets flottante. -->
    <RouterView class="flex-1" :class="route.meta.showNav !== false && 'pb-28 md:pb-10'" />
  </div>
</template>
