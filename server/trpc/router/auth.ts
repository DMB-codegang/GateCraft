import {initTRPC, TRPCError} from '@trpc/server'
import {z} from 'zod'
import {and, eq} from 'drizzle-orm'
import {compare, hash} from 'bcrypt-ts'
import {sign} from 'hono/jwt'

import type {Context} from '../type'
import {users} from '../../db/schema'
import {authConfig} from '../../utils/config'
import { publicProcedure, protectedProcedure } from '../trpc'

const t = initTRPC.context<Context>().create()

export const authRouter = t.router({
    /** 用户登录 */
    login: publicProcedure
        .input(z.object({
            username: z.string(),
            password: z.string(),
        }))
        .mutation(async ({ctx, input}) => {
            console.log(`login: ${input.username}`)
            // 1. 根据用户名查找用户
            const [user] = await ctx.db
                .select()
                .from(users)
                .where(and(eq(users.name, input.username), eq(users.email, input.username)))

            if (!user) {
                console.log(`用户不存在: ${input.username}`)
                throw new TRPCError({code: 'NOT_FOUND', message: '用户不存在'})
            }

            if (!user.password) {
                console.log(`用户未设置密码: ${input.username}`)
                throw new TRPCError({code: 'UNAUTHORIZED', message: '该账号未设置密码，请使用其他方式登录'})
            }

            // 2. 比对密码
            console.log(`比对密码中`)
            const isValid = await compare(input.password, user.password)
            if (!isValid) {
                throw new TRPCError({code: 'UNAUTHORIZED', message: '密码错误'})
            }

            // 3. 生成 jwt
            console.log(`生成jwt中`)
            const payload = {
                user: user.name,
                role: user.role,
                exp: Math.floor(Date.now() / 1000 + authConfig.tokenExpirySeconds),
                iat: Math.floor(Date.now() / 1000),
            }
            const jwt = await sign(payload, await getSecret(ctx))


            // 4. 返回 token 及用户信息
            return {
                token: jwt,
                user: {
                    id: user.id,
                    username: user.name,
                    nickname: user.nickname,
                    email: user.email,
                    role: user.role,
                    avatar: user.avatar,
                },
            }
        }),

    register: publicProcedure
        .input(z.object({
            username: z.string().min(2).max(20),
            password: z.string().min(6),
            nickname: z.string().min(1),
            email: z.email().optional(),
        }))
        .mutation(async ({ctx, input}) => {
            // 1.查询是否有重复的用户
            const [existing] = await ctx.db
                .select()
                .from(users)
                .where(eq(users.name, input.username))

            if (existing) {
                throw new TRPCError({code: 'CONFLICT', message: '用户名已存在'})
            }

            const hashedPassword = await hash(input.password, 10)
            const [user] = await ctx.db
                .insert(users)
                .values({
                    name: input.username,
                    nickname: input.nickname,
                    password: hashedPassword,
                    email: input.email,
                })
                .returning()

            const payload = {
                user: user!.name,
                role: user!.role,
                exp: Math.floor(Date.now() / 1000 + authConfig.tokenExpirySeconds),
                iat: Math.floor(Date.now() / 1000),
            }
            const jwt = await sign(payload, await getSecret(ctx))

            return {
                token: jwt,
                user: {
                    id: user!.id,
                    username: user!.name,
                    nickname: user!.nickname,
                    role: user.role,
                    email: user!.email,
                    avatar: user!.avatar,
                },
            }
        }),

    getProfile: protectedProcedure
        .mutation(async ({ctx}) => {
            const [user] = await ctx.db
                .select()
                .from(users)
                .where(eq(users.name, ctx.user.name))
            if (!user) {
                throw new TRPCError({code: 'NOT_FOUND', message: '没有查询到用户信息'})
            }
            return {
                user: {
                    id: user.id,
                    username: user.name,
                    nickname: user.nickname,
                    email: user.email,
                    role: user.role,
                    avatar: user.avatar
                }
            }
        })
})

async function getSecret(ctx: Context) {
    let secret = await ctx.kv.get('secret')
    if (!secret) {
        const bytes = new Uint8Array(32)
        crypto.getRandomValues(bytes)
        secret = btoa(String.fromCharCode(...bytes))
        await ctx.kv.put('secret', secret)
    }
    return secret
}
