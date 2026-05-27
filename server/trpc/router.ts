import { initTRPC } from '@trpc/server'
import { authRouter } from './auth'
import type { Context } from './type'

const t = initTRPC.context<Context>().create()

export const appRouter = t.router({
    auth: authRouter,
})

export type AppRouter = typeof appRouter