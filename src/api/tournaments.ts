import { http } from './client'
import type {
  GameGoal,
  GlobalStats,
  PlayerDetail,
  PlayerRef,
  PlayerWithStats,
  TournamentDetail,
  TournamentSummary,
} from '@/types'

type Detail = Promise<TournamentDetail>

async function unwrap(request: Promise<{ data: { data: TournamentDetail } }>): Detail {
  return (await request).data.data
}

export async function fetchTournaments(): Promise<TournamentSummary[]> {
  const { data } = await http.get<{ data: TournamentSummary[] }>('/api/tournaments')
  return data.data
}

export function fetchTournament(id: number): Detail {
  return unwrap(http.get(`/api/tournaments/${id}`))
}

export interface TournamentPayload {
  name: string
  group_count: number
  wb_per_group: number
  lb_per_group: number
  target_score: number
}

// Le nom suffit : le format prend ses valeurs par défaut côté API.
export function createTournament(payload: Pick<TournamentPayload, 'name'>): Detail {
  return unwrap(http.post('/api/tournaments', payload))
}

export function updateTournament(id: number, payload: Partial<TournamentPayload>): Detail {
  return unwrap(http.patch(`/api/tournaments/${id}`, payload))
}

export async function deleteTournament(id: number): Promise<void> {
  await http.delete(`/api/tournaments/${id}`)
}

export function drawTournament(id: number): Detail {
  return unwrap(http.post(`/api/tournaments/${id}/draw`))
}

export function resetDraw(id: number): Detail {
  return unwrap(http.delete(`/api/tournaments/${id}/draw`))
}

export interface TeamPayload {
  name: string
  // Identifiants de joueurs existants.
  players: [number, number]
  // Couleur de l'écusson ; attribuée automatiquement par l'API si absente.
  color?: string
}

export function createTeam(tournamentId: number, payload: TeamPayload): Detail {
  return unwrap(http.post(`/api/tournaments/${tournamentId}/teams`, payload))
}

export function updateTeam(teamId: number, payload: TeamPayload): Detail {
  return unwrap(http.patch(`/api/teams/${teamId}`, payload))
}

export function uploadTeamLogo(teamId: number, file: File): Detail {
  const form = new FormData()
  form.append('logo', file)
  return unwrap(http.post(`/api/teams/${teamId}/logo`, form))
}

export function deleteTeamLogo(teamId: number): Detail {
  return unwrap(http.delete(`/api/teams/${teamId}/logo`))
}

export function deleteTeam(teamId: number): Detail {
  return unwrap(http.delete(`/api/teams/${teamId}`))
}

export interface GamePayload {
  scheduled_at?: string | null
  score_a?: number | null
  score_b?: number | null
  // Buteurs : liste complète, remplace l'existant.
  goals?: GameGoal[]
}

export function updateGame(gameId: number, payload: GamePayload): Detail {
  return unwrap(http.patch(`/api/games/${gameId}`, payload))
}

export async function fetchPlayers(): Promise<PlayerWithStats[]> {
  const { data } = await http.get<{ data: PlayerWithStats[] }>('/api/players')
  return data.data
}

export async function createPlayer(name: string): Promise<PlayerRef> {
  const { data } = await http.post<{ data: PlayerRef }>('/api/players', { name })
  return data.data
}

export async function updatePlayer(id: number, name: string): Promise<PlayerRef> {
  const { data } = await http.patch<{ data: PlayerRef }>(`/api/players/${id}`, { name })
  return data.data
}

export async function deletePlayer(id: number): Promise<void> {
  await http.delete(`/api/players/${id}`)
}

export async function fetchPlayer(id: number): Promise<PlayerDetail> {
  const { data } = await http.get<{ data: PlayerDetail }>(`/api/players/${id}`)
  return data.data
}

export async function fetchStats(): Promise<GlobalStats> {
  const { data } = await http.get<{ data: GlobalStats }>('/api/stats')
  return data.data
}
