import type { Game, Slot, Stage, Team, TournamentDetail, TournamentStatus } from '@/types'

export const STATUS_LABELS: Record<TournamentStatus, string> = {
  draft: 'Inscriptions',
  groups: 'Phase de poules',
  bracket: 'Phase finale',
  finished: 'Terminé',
}

export const STAGE_LABELS: Record<Stage, string> = {
  group: 'Poule',
  winner: 'Ligue des champions',
  loser: 'Ligue des espoirs',
  final: 'Grande finale',
}

/** Texte noir ou blanc lisible sur une couleur d'équipe (#rrggbb). */
export function contrastText(hex: string | null | undefined): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt((hex ?? '#444444').slice(i, i + 2), 16))
  return 0.299 * r! + 0.587 * g! + 0.114 * b! > 160 ? '#0a0a0a' : '#ffffff'
}

/** Couleur d'équipe avec transparence (alpha 0–1), pour les surbrillances. */
export function teamTint(hex: string | null | undefined, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')
  return `${hex ?? '#444444'}${a}`
}

export function teamById(tournament: TournamentDetail, id: number | null): Team | undefined {
  return id === null ? undefined : tournament.teams.find((t) => t.id === id)
}

export function poolName(tournament: TournamentDetail, poolId: number | null): string {
  return tournament.pools.find((p) => p.id === poolId)?.name ?? '?'
}

export function isPlayed(game: Game): boolean {
  return game.score_a !== null && game.score_b !== null
}

export function winnerSlot(game: Game): Slot | null {
  if (!isPlayed(game)) return null
  return game.score_a! > game.score_b! ? 'a' : 'b'
}

function ordinal(rank: number): string {
  return rank === 1 ? '1er' : `${rank}e`
}

/**
 * Libellé d'une case encore vide : place qualificative ("1er poule A") ou
 * provenance ("Vainqueur M12", "Perdant M9").
 */
export function placeholderLabel(tournament: TournamentDetail, game: Game, slot: Slot): string {
  const seed = slot === 'a' ? game.seed_a : game.seed_b
  if (seed) {
    const [pool, rank] = seed.split(':')
    return `${ordinal(Number(rank))} poule ${pool}`
  }
  const from = tournament.games.find(
    (g) =>
      (g.winner_to_game_id === game.id && g.winner_to_slot === slot) ||
      (g.loser_to_game_id === game.id && g.loser_to_slot === slot),
  )
  if (!from) return 'À déterminer'
  return from.winner_to_game_id === game.id
    ? `Vainqueur M${from.number}`
    : `Perdant M${from.number}`
}

export function slotLabel(tournament: TournamentDetail, game: Game, slot: Slot): string {
  const team = teamById(tournament, slot === 'a' ? game.team_a_id : game.team_b_id)
  return team?.name ?? placeholderLabel(tournament, game, slot)
}

/** Nom d'un tour : "Demi-finales Champions", "Finale Espoirs", "Espoirs · tour 2"... */
export function roundLabel(stage: Stage, round: number, maxRound: number): string {
  if (stage === 'final') return 'Grande finale'
  if (stage === 'group') return `Journée ${round}`
  const fromEnd = maxRound - round
  if (stage === 'winner') {
    if (fromEnd === 0) return 'Finale Champions'
    if (fromEnd === 1) return 'Demi-finales Champions'
    if (fromEnd === 2) return 'Quarts Champions'
    return `Champions · tour ${round}`
  }
  if (fromEnd === 0) return 'Finale Espoirs'
  if (fromEnd === 1) return 'Demi-finale Espoirs'
  return `Espoirs · tour ${round}`
}

/** Où va le perdant d'un match de la Ligue des champions ("↘ Perdant → Espoirs · tour 2"). */
export function loserDestination(tournament: TournamentDetail, game: Game): string | null {
  if (!game.loser_to_game_id) return null
  const target = tournament.games.find((g) => g.id === game.loser_to_game_id)
  if (!target) return null
  const maxRound = Math.max(
    ...tournament.games.filter((g) => g.stage === target.stage).map((g) => g.round),
  )
  return roundLabel(target.stage, target.round, maxRound)
}

export function gameTitle(tournament: TournamentDetail, game: Game): string {
  if (game.stage === 'group')
    return `Poule ${poolName(tournament, game.pool_id)} · Journée ${game.round}`
  const maxRound = Math.max(
    ...tournament.games.filter((g) => g.stage === game.stage).map((g) => g.round),
  )
  return roundLabel(game.stage, game.round, maxRound)
}

export function teamGames(tournament: TournamentDetail, teamId: number): Game[] {
  return tournament.games.filter((g) => g.team_a_id === teamId || g.team_b_id === teamId)
}

export interface TeamStats {
  played: number
  wins: number
  losses: number
  goals_for: number
  goals_against: number
  goal_diff: number
}

export function teamStats(tournament: TournamentDetail, teamId: number): TeamStats {
  const stats: TeamStats = {
    played: 0,
    wins: 0,
    losses: 0,
    goals_for: 0,
    goals_against: 0,
    goal_diff: 0,
  }
  for (const game of teamGames(tournament, teamId)) {
    if (!isPlayed(game)) continue
    const isA = game.team_a_id === teamId
    const scored = isA ? game.score_a! : game.score_b!
    const conceded = isA ? game.score_b! : game.score_a!
    stats.played++
    stats.goals_for += scored
    stats.goals_against += conceded
    if (scored > conceded) stats.wins++
    else stats.losses++
  }
  stats.goal_diff = stats.goals_for - stats.goals_against
  return stats
}

/**
 * Situation d'une équipe : champion, éliminée, ou encore en course (et où).
 */
export function teamStatus(tournament: TournamentDetail, teamId: number): string {
  const final = tournament.games.find((g) => g.stage === 'final')
  if (final && isPlayed(final)) {
    const winner = winnerSlot(final) === 'a' ? final.team_a_id : final.team_b_id
    if (winner === teamId) return '🏆 Champion'
  }
  if (tournament.status === 'draft') return 'Inscrite'
  if (tournament.status === 'groups') return 'En phase de poules'

  const games = teamGames(tournament, teamId).filter((g) => g.stage !== 'group')
  if (games.length === 0) return 'Éliminée en poule'
  const pending = games.find((g) => !isPlayed(g))
  if (pending)
    return pending.stage === 'final'
      ? 'En grande finale'
      : `En course · ${STAGE_LABELS[pending.stage]}`
  return 'Éliminée'
}

export function formatDate(iso: string | null, withDay = true): string {
  if (!iso) return 'Date à définir'
  const date = new Date(iso)
  return date.toLocaleString('fr-FR', {
    ...(withDay ? { weekday: 'short', day: 'numeric', month: 'short' } : {}),
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Couleur d'accent par phase, comme l'exemple (teal / coral / ambre). */
export const STAGE_ACCENT: Record<Stage, string> = {
  group: 'var(--color-text-muted)',
  winner: 'var(--color-winner)',
  loser: 'var(--color-loser)',
  final: 'var(--color-final)',
}

/** Format choisi → répartition des équipes (aperçu dans l'admin). */
export function formatSummary(teamCount: number, groups: number, wb: number, lb: number) {
  const wbTeams = groups * wb
  const lbTeams = groups * lb
  const eliminated = Math.max(0, teamCount - wbTeams - lbTeams)
  let error: string | null = null
  if (wbTeams < 2) error = 'Il faut au moins 2 équipes qualifiées en Ligue des champions.'
  else if (teamCount < groups * 2)
    error = `Il faut au moins ${groups * 2} équipes pour ${groups} poules.`
  else if (Math.floor(teamCount / groups) < wb + lb)
    error = `La plus petite poule compterait ${Math.floor(teamCount / groups)} équipes : pas assez pour qualifier ${wb + lb} équipes par poule.`
  return { wbTeams, lbTeams, eliminated, error }
}
