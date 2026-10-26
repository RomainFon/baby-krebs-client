import { isAxiosError } from 'axios'

// Extrait un message lisible d'une erreur Axios : première erreur de
// validation Laravel (`errors`), sinon `message`, sinon le fallback fourni.
export function extractErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const errors = error.response?.data?.errors as Record<string, string[]> | undefined
    const firstMessage = errors ? Object.values(errors)[0]?.[0] : undefined
    return firstMessage ?? error.response?.data?.message ?? fallback
  }
  return fallback
}
