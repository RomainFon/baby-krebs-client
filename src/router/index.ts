import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    guestOnly?: boolean
    requiresAuth?: boolean
    showNav?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
    },
    {
      path: '/tournois',
      name: 'tournaments',
      component: () => import('@/views/TournamentsView.vue'),
    },
    {
      path: '/tournois/:tournamentId',
      component: () => import('@/views/TournamentLayout.vue'),
      props: (route) => ({ tournamentId: Number(route.params.tournamentId) }),
      children: [
        {
          path: '',
          name: 'bracket',
          component: () => import('@/views/BracketView.vue'),
        },
        {
          path: 'matchs',
          name: 'games',
          component: () => import('@/views/GamesView.vue'),
        },
        {
          path: 'equipes',
          name: 'teams',
          component: () => import('@/views/TeamsView.vue'),
        },
        {
          path: 'reglement',
          name: 'rules',
          component: () => import('@/views/RulesView.vue'),
        },
        {
          path: 'equipes/:teamId',
          name: 'team',
          component: () => import('@/views/TeamDetailView.vue'),
          props: (route) => ({ teamId: Number(route.params.teamId) }),
        },
      ],
    },
    {
      path: '/joueurs',
      name: 'players',
      component: () => import('@/views/PlayersView.vue'),
    },
    {
      path: '/joueurs/:playerId',
      name: 'player',
      component: () => import('@/views/PlayerDetailView.vue'),
      props: (route) => ({ playerId: Number(route.params.playerId) }),
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/views/admin/AdminTournamentsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/joueurs',
      name: 'admin-players',
      component: () => import('@/views/admin/AdminPlayersView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/tournois/:tournamentId',
      name: 'admin-tournament',
      component: () => import('@/views/admin/AdminTournamentView.vue'),
      props: (route) => ({ tournamentId: Number(route.params.tournamentId) }),
      meta: { requiresAuth: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { guestOnly: true, showNav: false },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: { name: 'home' },
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.guestOnly && auth.user) {
    return { name: 'admin' }
  }
  if (to.meta.requiresAuth && !auth.user) {
    return { name: 'login' }
  }
})

export default router
