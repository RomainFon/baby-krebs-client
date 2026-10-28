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

const form = reactive<{
  name: string
  one: number | ''
  two: number | ''
  color: string
  shortName: string
}>({
  name: props.initial?.name ?? '',
  one: props.initial?.players[0] ?? '',
  two: props.initial?.players[1] ?? '',
  color: props.initial?.color ?? '',
  shortName: props.initial?.short_name ?? '',
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
  emit('submit', {
    name: form.name.trim(),
    players: [form.one, form.two],
    ...(form.color ? { color: form.color } : {}),
    // Envoyé seulement s'il a changé : sinon les initiales restent calculées
    // (et suivent un renommage de l'équipe).
    ...(props.initial && form.shortName.trim() !== props.initial.short_name
      ? { short_name: form.shortName.trim() }
      : {}),
  })
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
    <!-- Couleur et diminutif : seulement en modification (couleur tirée au
         hasard et initiales calculées à la création). Le sélecteur natif
         ouvre la roue chromatique du système. -->
    <div v-if="initial" class="flex flex-wrap items-center gap-x-6 gap-y-2">
      <label class="flex items-center gap-2 text-sm">
        <span class="text-muted">Diminutif</span>
        <input
          v-model="form.shortName"
          maxlength="5"
          pattern="[\p{L}\p{N}]*"
          title="Lettres et chiffres uniquement, 5 max"
          placeholder="Initiales"
          class="field w-24 py-1.5 font-semibold uppercase"
        />
      </label>
      <label v-if="initial.color" class="flex w-fit cursor-pointer items-center gap-3 text-sm">
        <span
          class="relative h-9 w-9 overflow-hidden rounded-full ring-2 ring-line"
          :style="{ background: form.color }"
        >
          <input
            v-model="form.color"
            type="color"
            class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Couleur de l'équipe"
          />
        </span>
        <span class="text-muted">Couleur de l'équipe</span>
        <span class="font-mono text-xs text-muted uppercase">{{ form.color }}</span>
      </label>
    </div>
    <p v-if="noPlayerLeft" class="text-xs text-muted">
      Plus assez de joueurs disponibles : crée-en de nouveaux pour inscrire une équipe.
    </p>
  </form>
</template>
