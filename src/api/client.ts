import axios from 'axios'

// En dev, les requêtes passent par le proxy Vite (voir vite.config.ts) donc
// des chemins relatifs suffisent. En prod, l'app buildée appelle l'API sur
// son propre domaine (routage par chemin via Traefik).
const API_URL = import.meta.env.DEV ? '' : import.meta.env.VITE_API_URL

export const http = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: 'application/json',
  },
})

export async function ensureCsrfCookie() {
  await http.get('/sanctum/csrf-cookie')
}
