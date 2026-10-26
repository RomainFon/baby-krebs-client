<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import { createPlayer, updatePlayer } from '@/api/tournaments'
import { extractErrorMessage } from '@/lib/apiError'
import type { PlayerRef } from '@/types'

// Création d'un joueur, ou renommage si `player` est fourni.
const props = defineProps<{ open: boolean; player?: PlayerRef | null }>()
const emit = defineEmits<{ close: []; saved: [player: PlayerRef] }>()

const name = ref('')
const input = ref<HTMLInputElement | null>(null)
const error = ref<string | null>(null)
const isSaving = ref(false)

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    name.value = props.player?.name ?? ''
    error.value = null
    await nextTick()
    input.value?.focus()
  },
)

async function handleSubmit() {
  error.value = null
  isSaving.value = true
  try {
    const saved = props.player
      ? await updatePlayer(props.player.id, name.value)
      : await createPlayer(name.value)
    emit('saved', saved)
    emit('close')
  } catch (e) {
    error.value = extractErrorMessage(e, "Impossible d'enregistrer le joueur.")
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <AppModal
    :open="open"
    :title="player ? 'Renommer le joueur' : 'Nouveau joueur'"
    @close="emit('close')"
  >
    <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
      <label class="text-sm">
        <span class="mb-1 block text-muted">Nom</span>
        <input
          ref="input"
          v-model="name"
          required
          maxlength="50"
          class="field"
          placeholder="Prénom (ou surnom)"
        />
      </label>
      <p v-if="error" class="text-sm text-danger">{{ error }}</p>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-ghost" @click="emit('close')">Annuler</button>
        <button type="submit" class="btn-primary" :disabled="isSaving || !name.trim()">
          {{ player ? 'Enregistrer' : 'Créer' }}
        </button>
      </div>
    </form>
  </AppModal>
</template>
