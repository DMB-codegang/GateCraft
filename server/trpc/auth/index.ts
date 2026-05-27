import { initTRPC, TRPCError } from '@trpc/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { compare } from 'bcrypt-ts'
import { sign } from 'hono/jwt'

import type { Context } from '../type'
import { users } from '../../db/schema'
import { authConfig } from '../../utils/config'

const t = initTRPC.context<Context>().create()

export const authRouter = t.router({
    /** 用户登录 */
    login: t.procedure
        .input(z.object({
            name: z.string(),
            password: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            // 1. 根据用户名查找用户
            const [user] = await ctx.db
                .select()
                .from(users)
                .where(eq(users.name, input.name))

            if (!user) {
                throw new TRPCError({ code: 'NOT_FOUND', message: '用户不存在' })
            }

            // 2. 比对密码
            const isValid = await compare(input.password, user.password)
            if (!isValid) {
                throw new TRPCError({ code: 'UNAUTHORIZED', message: '密码错误' })
            }

            // 3. 生成 jwt
            let secret = await ctx.kv.get('secret')
            if (!secret) {
                const bytes = new Uint8Array(32)
                crypto.getRandomValues(bytes)
                secret = btoa(String.fromCharCode(...bytes))
                await ctx.kv.put('secret', secret)
            }
            const payload = {
                user: user.name,
                role: user.role,
                exp: Math.floor(Date.now() / 1000 + authConfig.tokenExpirySeconds),
                iat: Math.floor(Date.now() / 1000),
            }
            const jwt = await sign(payload, secret)


            // 4. 返回 token 及用户信息
            return {
                jwt,
                user: {
                    id: user.id,
                    name: user.name,
                    nickname: user.nickname,
                    email: user.email,
                    qq: user.qq,
                },
            }
        }),
})
