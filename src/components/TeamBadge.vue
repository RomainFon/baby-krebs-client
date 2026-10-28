<script setup lang="ts">
import { computed } from 'vue'
import { contrastText } from '@/lib/tournament'

// Écusson d'une équipe, façon blason de club : logo s'il existe, sinon
// diminutif (3 lettres max) sur la couleur de l'équipe. Sans équipe (case encore vide de
// l'arbre), un rond en pointillés.
const props = defineProps<{
  team?: {
    name: string
    short_name?: string
    color: string | null
    logo_url: string | null
  } | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}>()

const SIZES = {
  xs: 'h-5 w-5 text-[8px]',
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-2xl',
}

const initials = computed(() => {
  if (props.team?.short_name) return props.team.short_name.slice(0, 3)
  const words = (props.team?.name ?? '')
    .replace(/^(les|le|la|l')\s*/i, '')
    .split(/[\s-]+/)
    .filter(Boolean)
  return (
    words.length > 1 ? words[0]![0]! + words[1]![0]! : (words[0] ?? '?').slice(0, 2)
  ).toUpperCase()
})

// Texte noir ou blanc selon la luminosité de la couleur de fond.
const textColor = computed(() => contrastText(props.team?.color))
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-display leading-none"
    :class="[SIZES[size ?? 'sm'], !team && 'border border-dashed border-muted/50']"
    :style="
      team && !team.logo_url ? { background: team.color ?? '#444', color: textColor } : undefined
    "
    aria-hidden="true"
  >
    <img
      v-if="team?.logo_url"
      :src="team.logo_url"
      alt=""
      class="h-full w-full bg-white object-cover"
    />
    <template v-else-if="team">{{ initials }}</template>
  </span>
</template>
