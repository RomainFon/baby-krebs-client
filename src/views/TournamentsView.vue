<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTournamentStore } from '@/stores/tournament'
import TournamentCard from '@/components/TournamentCard.vue'

const auth = useAuthStore()
const store = useTournamentStore()
const isLoading = ref(true)

onMounted(async () => {
  try {
    await store.loadList()
  } finally {
    isLoading.value = false
  }
})

const live = computed(() =>
  store.list.filter((t) => t.status === 'groups' || t.status === 'bracket'),
)
const upcoming = computed(() => store.list.filter((t) => t.status === 'draft'))
const finished = computed(() => store.list.filter((t) => t.status === 'finished'))
</script>

<template>
  <main class="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-6">
    <h1 class="font-display text-2xl font-extrabold sm:text-3xl">Tournois</h1>

    <p v-if="isLoading" class="text-sm text-muted">Chargement…</p>
    <template v-else>
      <p v-if="store.list.length === 0" class="card p-6 text-center text-muted">
        Aucun tournoi pour l'instant.
        <RouterLink v-if="auth.user" :to="{ name: 'admin' }" class="text-primary hover:underline"
          >En créer un</RouterLink
        >
      </p>

      <section v-if="live.length" class="flex flex-col gap-3">
        <h2
          class="flex items-center gap-2 text-sm font-semibold tracking-wide text-muted uppercase"
        >
          <span class="h-2 w-2 animate-pulse rounded-full bg-loser" /> En cours
        </h2>
        <TournamentCard v-for="t in live" :key="t.id" :tournament="t" featured />
      </section>

      <section v-if="upcoming.length" class="flex flex-col gap-3">
        <h2 class="text-sm font-semibold tracking-wide text-muted uppercase">À venir</h2>
        <TournamentCard v-for="t in upcoming" :key="t.id" :tournament="t" />
      </section>

      <section v-if="finished.length" class="flex flex-col gap-3">
        <h2 class="text-sm font-semibold tracking-wide text-muted uppercase">Déjà joués</h2>
        <TournamentCard v-for="t in finished" :key="t.id" :tournament="t" />
      </section>
    </template>
  </main>
</template>
