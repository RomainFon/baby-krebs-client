<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { TournamentDetail } from '@/types'
import { winnerSlot } from '@/lib/tournament'

// Pointillés "vainqueur → match suivant" par-dessus l'arbre (Ligue des
// champions + Ligue des espoirs + grande finale). Positions mesurées dans le
// DOM : chaque carte porte data-game-card="<id>", chaque ligue
// data-bracket-section. Le parent (relative) contient les cartes et ce SVG.
const props = defineProps<{ tournament: TournamentDetail; highlightTeamId?: number | null }>()

const svg = ref<SVGSVGElement | null>(null)
const size = ref({ width: 0, height: 0 })
const paths = ref<{ key: string; d: string; dimmed: boolean }[]>([])

const GAP = 12 // demi-espace entre deux colonnes (gap-6)

function compute() {
  const container = svg.value?.parentElement
  if (!container) return
  const origin = container.getBoundingClientRect()
  size.value = { width: container.scrollWidth, height: container.scrollHeight }

  const cards = new Map<number, HTMLElement>()
  container.querySelectorAll<HTMLElement>('[data-game-card]').forEach((el) => {
    cards.set(Number(el.dataset.gameCard), el)
  })
  const box = (el: Element) => {
    const r = el.getBoundingClientRect()
    return {
      left: r.left - origin.left,
      right: r.right - origin.left,
      top: r.top - origin.top,
      bottom: r.bottom - origin.top,
      mid: r.top - origin.top + r.height / 2,
    }
  }

  const highlight = props.highlightTeamId ?? null
  const result: typeof paths.value = []
  for (const game of props.tournament.games) {
    if (!game.winner_to_game_id) continue
    const fromEl = cards.get(game.id)
    const toEl = cards.get(game.winner_to_game_id)
    if (!fromEl || !toEl) continue
    const from = box(fromEl)
    const to = box(toEl)
    // Équipe suivie : le lien reste allumé s'il est (ou peut encore être)
    // emprunté par elle — vainqueur du match joué, ou engagée dans un match à venir.
    const winner = winnerSlot(game)
    const travellers = winner
      ? [winner === 'a' ? game.team_a_id : game.team_b_id]
      : [game.team_a_id, game.team_b_id]
    const dimmed = highlight !== null && !travellers.includes(highlight)

    let d: string
    if (to.left > from.right + 4) {
      // Cas courant : cible plus à droite, coude juste après le match de
      // départ (au milieu de l'espace entre deux colonnes voisines ; sur un
      // saut de plusieurs colonnes, la ligne file ensuite à l'horizontale).
      const midX = from.right + GAP
      d = `M ${from.right} ${from.mid} H ${midX} V ${to.mid} H ${to.left}`
    } else {
      // Cible plus à gauche (finale Espoirs → grande finale) : on remonte par
      // l'espace entre les deux ligues.
      const toSection = toEl.closest('[data-bracket-section]')
      const fromSection = fromEl.closest('[data-bracket-section]')
      const gapY =
        toSection && fromSection && toSection !== fromSection
          ? (box(toSection).bottom + box(fromSection).top) / 2
          : Math.min(from.top, to.top) - GAP
      d = `M ${from.right} ${from.mid} H ${from.right + GAP} V ${gapY} H ${to.left - GAP} V ${to.mid} H ${to.left}`
    }
    result.push({ key: `${game.id}-${game.winner_to_game_id}`, d, dimmed })
  }
  paths.value = result
}

let observer: ResizeObserver | null = null
onMounted(() => {
  compute()
  const container = svg.value?.parentElement
  if (container) {
    observer = new ResizeObserver(() => compute())
    observer.observe(container)
  }
})
onBeforeUnmount(() => observer?.disconnect())
watch(
  () => [props.tournament, props.highlightTeamId],
  () => nextTick(compute),
  { deep: false },
)
</script>

<template>
  <svg
    ref="svg"
    class="pointer-events-none absolute top-0 left-0"
    :width="size.width"
    :height="size.height"
    aria-hidden="true"
  >
    <path
      v-for="p in paths"
      :key="p.key"
      :d="p.d"
      fill="none"
      stroke="var(--color-primary)"
      stroke-width="2"
      stroke-dasharray="0.5 6"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="transition-opacity"
      :opacity="p.dimmed ? 0.12 : 0.8"
    />
  </svg>
</template>
