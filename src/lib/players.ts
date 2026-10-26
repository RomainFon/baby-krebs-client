import type { PlayerRef } from '@/types'

// Ordre alphabétique "humain" : insensible à la casse et aux accents.
export function sortByName<T extends PlayerRef>(players: T[]): T[] {
  return [...players].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
}
