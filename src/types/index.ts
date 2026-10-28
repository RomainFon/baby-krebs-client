export interface User {
  id: number
  name: string
  email: string
}

export type TournamentStatus = 'draft' | 'groups' | 'bracket' | 'finished'
export type Stage = 'group' | 'winner' | 'loser' | 'final'
export type Slot = 'a' | 'b'

export interface TournamentSummary {
  id: number
  name: string
  status: TournamentStatus
  group_count: number
  wb_per_group: number
  lb_per_group: number
  target_score: number
  teams_count: number
  games_total: number
  games_played: number
  starts_at: string | null
  champion: {
    id: number
    name: string
    short_name: string
    color: string | null
    logo_url: string | null
    players: [string, string]
  } | null
  created_at: string
}

export interface PlayerRef {
  id: number
  name: string
}

export interface Team {
  id: number
  name: string
  // Diminutif saisi, sinon initiales calculées par l'API ("CQP").
  short_name: string
  // Couleur de l'écusson (#rrggbb) et logo optionnel (URL relative).
  color: string | null
  logo_url: string | null
  pool_id: number | null
  players: [PlayerRef, PlayerRef]
}

export interface StandingRow {
  team_id: number
  rank: number
  played: number
  wins: number
  losses: number
  goals_for: number
  goals_against: number
  goal_diff: number
}

export interface Pool {
  id: number
  name: string
  standings: StandingRow[]
}

export interface Game {
  id: number
  number: number
  stage: Stage
  pool_id: number | null
  round: number
  position: number
  team_a_id: number | null
  team_b_id: number | null
  score_a: number | null
  score_b: number | null
  scheduled_at: string | null
  played_at: string | null
  // Place qualificative "A:1" (1er de la poule A), avant la fin des poules.
  seed_a: string | null
  seed_b: string | null
  winner_to_game_id: number | null
  winner_to_slot: Slot | null
  loser_to_game_id: number | null
  loser_to_slot: Slot | null
  // Buteurs (facultatif) : buts de chaque joueur dans ce match.
  goals: GameGoal[]
}

export interface GameGoal {
  player_id: number
  goals: number
}

export interface TournamentDetail extends TournamentSummary {
  // Règlement en texte libre (titres "# ", listes "- ").
  rules: string | null
  teams: Team[]
  pools: Pool[]
  games: Game[]
}

export interface PlayerStats {
  played: number
  wins: number
  losses: number
  goals_for: number
  goals_against: number
  goal_diff: number
  win_rate: number
  tournaments: number
  titles: number
  fannys_given: number
  fannys_taken: number
  // Buts marqués par le joueur lui-même (matchs avec buteurs saisis).
  goals_scored: number
  games_with_goals: number
}

export interface PlayerWithStats extends PlayerRef {
  stats: PlayerStats
}

export interface PlayerDetail extends PlayerWithStats {
  teams: {
    id: number
    name: string
    tournament_id: number
    tournament_name: string
    tournament_status: TournamentStatus
    partner: PlayerRef
  }[]
  partners: (PlayerRef & { played: number; wins: number })[]
  games: {
    id: number
    number: number
    stage: Stage
    tournament_id: number
    tournament_name: string
    team_name: string
    opponent_name: string
    score_for: number
    score_against: number
    goals_scored: number | null
    played_at: string | null
  }[]
}

export interface GlobalStats {
  games_played: number
  best_player: PlayerWithStats | null
  worst_player: PlayerWithStats | null
  top_scorer: PlayerWithStats | null
  leakiest: PlayerWithStats | null
  most_titles: PlayerWithStats | null
  fanny_victim: PlayerWithStats | null
  min_games_for_ranking: number
}
