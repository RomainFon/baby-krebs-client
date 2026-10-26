<script setup lang="ts">
import { computed, reactive } from 'vue'
import type { TeamPayload } from '@/api/tournaments'
import type { PlayerRef } from '@/types'
import { sortByName } from '@/lib/players'

const props = defineProps<{
  initial?: TeamPayload
  submitLabel: string
  busy?: boolean
  // Joueurs existants : seuls choix possibles.
  players: PlayerRef[]
  // Joueurs déjà dans une autre équipe du tournoi (id → nom de l'équipe) :
  // non proposés, comme refusés côté API.
  taken: Map<number, string>
}>()
const emit = defineEmits<{ submit: [payload: TeamPayload]; cancel: [] }>()

const form = reactive<{ name: string; one: number | ''; two: number | '' }>({
  name: props.initial?.name ?? '',
  one: props.initial?.players[0] ?? '',
  two: props.initial?.players[1] ?? '',
})

// Choix d'un sélecteur : joueurs libres, par ordre alphabétique, sans celui
// déjà choisi dans l'autre sélecteur.
function optionsFor(other: number | '') {
  return sortByName(props.players.filter((p) => !props.taken.has(p.id) && p.id !== other))
}
const optionsOne = computed(() => optionsFor(form.two))
const optionsTwo = computed(() => optionsFor(form.one))

const noPlayerLeft = computed(() => optionsFor('').length < 2 && !props.initial)

function handleSubmit() {
  if (form.one === '' || form.two === '') return
  emit('submit', { name: form.name.trim(), players: [form.one, form.two] })
}

function reset() {
  form.name = ''
  form.one = ''
  form.two = ''
}

defineExpose({ reset })
</script>

<template>
  <form class="flex flex-col gap-1.5" @submit.prevent="handleSubmit">
    <div class="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
      <input
        v-model="form.name"
        required
        maxlength="50"
        placeholder="Nom de l'équipe"
        class="field"
      />
      <select v-model="form.one" required class="field" aria-label="Joueur 1">
        <option value="" disabled>Joueur 1</option>
        <option v-for="p in optionsOne" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
      <select v-model="form.two" required class="field" aria-label="Joueur 2">
        <option value="" disabled>Joueur 2</option>
        <option v-for="p in optionsTwo" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
      <div class="flex gap-2">
        <button
          type="submit"
          class="btn-primary flex-1"
          :disabled="busy || form.one === '' || form.two === ''"
        >
          {{ submitLabel }}
        </button>
        <button v-if="initial" type="button" class="btn-ghost" @click="emit('cancel')">
          Annuler
        </button>
      </div>
    </div>
    <p v-if="noPlayerLeft" class="text-xs text-muted">
      Plus assez de joueurs disponibles : crée-en de nouveaux pour inscrire une équipe.
    </p>
  </form>
</template>
