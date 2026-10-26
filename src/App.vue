<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import AppNav from '@/components/AppNav.vue'

const route = useRoute()
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <AppNav v-if="route.meta.showNav !== false" />
    <RouterView class="flex-1" />
  </div>
</template>
