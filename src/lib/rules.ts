import MarkdownIt from 'markdown-it'

// Règlement saisi en Markdown par l'admin. `html: false` : le HTML brut est
// échappé (et markdown-it refuse les liens javascript:), le rendu peut donc
// passer par v-html sans risque d'injection.
const md = new MarkdownIt({ html: false, linkify: true, breaks: true, typographer: false })

// Liens externes dans un nouvel onglet.
const defaultLinkOpen =
  md.renderer.rules.link_open ??
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx]!.attrSet('target', '_blank')
  tokens[idx]!.attrSet('rel', 'noopener noreferrer')
  return defaultLinkOpen(tokens, idx, options, env, self)
}

export function renderRules(text: string | null): string {
  return text?.trim() ? md.render(text) : ''
}
