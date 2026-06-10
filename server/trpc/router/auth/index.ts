import {TRPCError} from '@trpc/server'
import {z} from 'zod'
import {or, eq} from 'drizzle-orm'
import {compare, hash} from 'bcrypt-ts'

import {users} from '../../../db/schema'
import {authConfig} from '../../../../config'
import {router, publicProcedure} from '../../trpc'
import {qq} from './qq'
import {generateJwt} from "../../../utils/token";

export const authRouter = router({
    qq,
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
                .where(or(eq(users.name, input.username), eq(users.email, input.username)))

            if (!user) {
                console.log(`用户不存在: ${input.username}`)
                throw new TRPCError({code: 'NOT_FOUND', message: '用户不存在'})
            }

            if (!user.password) {
                console.log(`用户未设置密码: ${input.username}`)
                throw new TRPCError({code: 'UNAUTHORIZED', message: '该账号未设置密码，请使用其他方式登录'})
            }

            // 2. 比对密码
            const isValid = await compare(input.password, user.password)
            if (!isValid) throw new TRPCError({code: 'UNAUTHORIZED', message: '密码错误'})

            // 3. 生成 jwt
            const payload = {
                id: user.id,
                name: user.name,
                role: user.role,
            }
            const jwt = await generateJwt(payload, ctx.kv)


            // 4. 返回 token 及用户信息
            return {
                token: jwt,
                user: {
                    id: user.id,
                    username: user.name,
                    nickname: user.nickname,
                    email: user.email,
                    role: user!.role,
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
            // 0.判断是否开放注册
            if (!authConfig.register) throw new TRPCError({code: 'FORBIDDEN', message: '管理员没有开放注册功能'})

            // 1.查询是否有重复的用户
            const [existing] = await ctx.db
                .select()
                .from(users)
                .where(eq(users.name, input.username))

            if (existing) {
                throw new TRPCError({code: 'CONFLICT', message: '用户名已存在'})
            }

            // 2.加盐存储
            const hashedPassword = await hash(input.password, 10)
            const [user] = await ctx.db
                .insert(users)
                .values({
                    name: input.username,
                    nickname: input.nickname,
                    password: hashedPassword,
                    uuid: crypto.randomUUID().replace(/-/g, ''),
                    email: input.email,
                })
                .returning()
            if(!user) throw new Error('Failed to create user')

            // 3.生成 jwt
            const payload = {
                id: user.id,
                name: user!.name,
                role: user!.role,
            }
            const jwt = await generateJwt(payload, ctx.kv)

            return {
                token: jwt,
                user: {
                    id: user!.id,
                    username: user!.name,
                    nickname: user!.nickname,
                    role: user!.role,
                    email: user!.email,
                    avatar: user!.avatar,
                },
            }
        }),

})


