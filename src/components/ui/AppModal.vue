<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  open: boolean
  title?: string
  subtitle?: string
  // Dégradé en haut de la modale, teinté de cette couleur (ex. couleur de
  // la phase du match affiché).
  accentColor?: string | null
}>()
const emit = defineEmits<{ close: [] }>()

const panelStyle = computed(() =>
  props.accentColor
    ? {
        background: `radial-gradient(120% 60% at 50% 0%, color-mix(in srgb, ${props.accentColor} 20%, transparent), transparent 60%), var(--color-surface)`,
      }
    : undefined,
)

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open) {
    emit('close')
  }
}

onMounted(() => document.addEventListener('keydown', handleKeydown))
onUnmounted(() => document.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      @click.self="emit('close')"
    >
      <div
        class="relative w-full max-w-md rounded-lg border border-[var(--color-line)] p-5 shadow-xl"
        :class="{ 'bg-[var(--color-surface)]': !accentColor }"
        :style="panelStyle"
      >
        <button
          type="button"
          class="absolute top-4 right-4 cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          aria-label="Fermer"
          @click="emit('close')"
        >
          ✕
        </button>
        <div v-if="title" class="mb-4 pr-6">
          <h3 class="text-lg font-semibold">{{ title }}</h3>
          <p v-if="subtitle" class="mt-0.5 text-sm text-[var(--color-text-muted)]">
            {{ subtitle }}
          </p>
        </div>
        <slot />
      </div>
    </div>
  </Teleport>
</template>
