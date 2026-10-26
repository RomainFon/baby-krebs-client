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
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-3 pb-3 backdrop-blur-sm sm:items-center sm:px-4 sm:pb-0"
      @click.self="emit('close')"
    >
      <div
        class="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl p-6 shadow-2xl ring-1 ring-line"
        :class="{ 'bg-[var(--color-surface)]': !accentColor }"
        :style="panelStyle"
      >
        <button
          type="button"
          class="absolute top-4 right-4 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-surface-alt text-muted hover:text-text"
          aria-label="Fermer"
          @click="emit('close')"
        >
          ✕
        </button>
        <div v-if="title" class="mb-5 pr-10">
          <h3 class="font-display text-2xl tracking-wide uppercase">{{ title }}</h3>
          <p v-if="subtitle" class="mt-0.5 text-sm text-[var(--color-muted)]">
            {{ subtitle }}
          </p>
        </div>
        <slot />
      </div>
    </div>
  </Teleport>
</template>
