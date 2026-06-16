import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createUpdateSchema } from 'drizzle-zod'

import { router, loggedInProcedure, protectedProcedure } from '../../trpc'
import { users } from "../../../db/schema";
import {hash} from "bcrypt-ts";
import {generateJwt} from "../../../utils/token";

export const userRouter = router({
    getProfile: protectedProcedure
        .query(async ({ ctx }) => {
            const [user] = await ctx.db
                .select()
                .from(users)
                .where(eq(users.name, ctx.user.name))
            if (!user) {
                throw new TRPCError({ code: 'NOT_FOUND', message: '没有查询到用户信息' })
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
        }
        ),

    updateProfile: loggedInProcedure
        .input(createUpdateSchema(users).pick({
            name: true,
            nickname: true,
            password: true
        }).partial())
        .mutation(async ({ ctx, input }) => {
            if (input.password) {
                input.password = await hash(input.password, 10)
            }
            if (!ctx.user.onlyUpdate && input.name) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: '非管理员用户不能更新用户名' })
            }

            let updatedUser
            try {
                [updatedUser] = await ctx.db
                    .update(users)
                    .set(input)
                    .where(eq(users.id, ctx.user.id))
                    .returning()
            } catch (err) {
                if (err instanceof Error && err.message?.includes('UNIQUE constraint failed')) {
                    throw new TRPCError({ code: 'CONFLICT', message: '用户名重复' })
                }
                throw err
            }

            if (!updatedUser) {
                throw new TRPCError({ code: 'NOT_FOUND', message: '用户未查询到，请联系管理员核实' })
            }

            const token = await generateJwt(updatedUser, ctx.kv)

            return {
                token: token,
                user: {
                    id: updatedUser.id,
                    username: updatedUser.name,
                    nickname: updatedUser.nickname,
                    email: updatedUser.email,
                    role: updatedUser.role,
                    avatar: updatedUser.avatar,
                },
            }
        })
})