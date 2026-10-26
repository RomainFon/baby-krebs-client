<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { createTournament } from '@/api/tournaments'
import { useTournamentStore } from '@/stores/tournament'
import { STATUS_LABELS } from '@/lib/tournament'
import { extractErrorMessage } from '@/lib/apiError'
import AppModal from '@/components/ui/AppModal.vue'
import AdminTabs from '@/components/admin/AdminTabs.vue'
import PageTitle from '@/components/ui/PageTitle.vue'

const router = useRouter()
const store = useTournamentStore()

const isCreating = ref(false)
const name = ref('')
const nameInput = ref<HTMLInputElement | null>(null)
const error = ref<string | null>(null)
const isSubmitting = ref(false)

onMounted(() => store.loadList())

async function openCreate() {
  name.value = ''
  error.value = null
  isCreating.value = true
  await nextTick()
  nameInput.value?.focus()
}

// Création avec le seul nom : le format se règle ensuite dans l'onglet Infos.
async function handleCreate() {
  error.value = null
  isSubmitting.value = true
  try {
    const detail = await createTournament({ name: name.value })
    store.replace(detail)
    router.push({ name: 'admin-tournament', params: { tournamentId: detail.id } })
  } catch (e) {
    error.value = extractErrorMessage(e, 'Impossible de créer le tournoi.')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <main class="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <PageTitle kicker="Espace" title="Admin" />
      <button type="button" class="btn-primary" @click="openCreate">+ Nouveau tournoi</button>
    </div>
    <AdminTabs />

    <section class="flex flex-col gap-2">
      <p v-if="store.list.length === 0" class="card p-6 text-center text-sm text-muted">
        Aucun tournoi pour l'instant : crée le premier !
      </p>
      <RouterLink
        v-for="t in store.list"
        :key="t.id"
        :to="{ name: 'admin-tournament', params: { tournamentId: t.id } }"
        class="card flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-alt"
      >
        <div class="min-w-0">
          <p class="truncate font-semibold">{{ t.name }}</p>
          <p class="text-xs text-muted">
            {{ t.teams_count }} équipes · {{ t.group_count }} poule(s) · {{ t.wb_per_group }}+{{
              t.lb_per_group
            }}
            qualifiés par poule
          </p>
        </div>
        <span class="shrink-0 rounded-full bg-surface-alt px-2.5 py-0.5 text-xs text-muted">
          {{ STATUS_LABELS[t.status] }}
        </span>
      </RouterLink>
    </section>

    <AppModal
      :open="isCreating"
      title="Nouveau tournoi"
      subtitle="Le format, les équipes et les matchs se règlent ensuite."
      @close="isCreating = false"
    >
      <form class="flex flex-col gap-4" @submit.prevent="handleCreate">
        <label class="text-sm">
          <span class="mb-1 block text-muted">Nom</span>
          <input
            ref="nameInput"
            v-model="name"
            required
            maxlength="100"
            class="field"
            placeholder="Tournoi de Noël"
          />
        </label>
        <p v-if="error" class="text-sm text-danger">{{ error }}</p>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn-ghost" @click="isCreating = false">Annuler</button>
          <button type="submit" class="btn-primary" :disabled="isSubmitting || !name.trim()">
            Créer
          </button>
        </div>
      </form>
    </AppModal>
  </main>
</template>
