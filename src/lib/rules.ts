export type RulesBlock =
  | { type: 'heading'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'paragraph'; text: string }

/**
 * Découpe le règlement saisi par l'admin en blocs affichables : "# Titre",
 * lignes "- " ou "* " regroupées en liste, le reste en paragraphes (séparés
 * par une ligne vide). Rendu via le template, donc sans injection HTML.
 */
export function parseRules(text: string | null): RulesBlock[] {
  const blocks: RulesBlock[] = []
  let paragraph: string[] = []
  const flush = () => {
    if (paragraph.length) blocks.push({ type: 'paragraph', text: paragraph.join('\n') })
    paragraph = []
  }
  for (const raw of (text ?? '').split(/\r?\n/)) {
    const line = raw.trim()
    const heading = line.match(/^#+\s+(.*)$/)
    const item = line.match(/^[-*•]\s+(.*)$/)
    if (!line) flush()
    else if (heading) {
      flush()
      blocks.push({ type: 'heading', text: heading[1]! })
    } else if (item) {
      flush()
      const last = blocks[blocks.length - 1]
      if (last?.type === 'list') last.items.push(item[1]!)
      else blocks.push({ type: 'list', items: [item[1]!] })
    } else paragraph.push(line)
  }
  flush()
  return blocks
}
