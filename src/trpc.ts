import { createTRPCProxyClient, httpLink } from '@trpc/client'
import type { AppRouter } from '../server/trpc/router'

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpLink({
      url: '/trpc',
      headers() {
        const token = localStorage.getItem('token')
        return token ? { Authorization: `Bearer ${token}` } : {}
      },
    }),
  ],
})
