import { initTRPC, TRPCError } from '@trpc/server'
import type { Context } from './type'

const t = initTRPC.context<Context>().create()

// 中间件定义
const isAuthed = t.middleware(({ ctx, next }) => {
    if (!ctx.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: '未登录' })
    }
    return next({
        ctx: {
            user: ctx.user,
        }
    })
})
const isAdmin = t.middleware(({ ctx, next }) => {
    if (!ctx.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: '请先登录' })
    }
    if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: '权限不足' })
    }
    return next({
        ctx: {
            user: ctx.user,
        },
    })
})

// 导出 procedures 和 router
export const router = t.router
export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure.use(isAuthed)
export const adminProcedure = t.procedure.use(isAdmin)