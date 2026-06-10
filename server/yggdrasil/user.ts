import { Hono } from "hono";
import {verify} from 'hono/jwt'
import {compare} from "bcrypt-ts";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

import type { Env } from '../type'
import { createDb } from "../db";
import {users} from "../db/schema";
import {eq, or} from "drizzle-orm";
import {generateJwt} from "../utils/token";
import {getSecret} from "../utils/secret";

export const authServer = new Hono<{ Bindings: Env }>()

authServer.post('/authenticate', zValidator('json', z.object({
    username: z.string(),
    password: z.string(),
    clientToken: z.string(),
    requestUser: z.boolean(),
    agent: z.object({
        name: z.string(),
        version: z.number(),
    })
})), async (c) => {
    const input = c.req.valid('json')
    const drizzle = createDb(c.env.db)

    // 1. 根据用户名查找用户
    const [user] = await drizzle.select().from(users).where(or(eq(users.name, input.username), eq(users.email, input.username)))

    if (!user) return c.json({error: 'User not found', errorMessage: '没有找到该用户'}, 404)
    if (!user.password) return c.json({error: 'User not set password', errorMessage: '您没有设置密码，请到网页设置密码'})

    // 2. 比对密码
    const isValid = await compare(input.password, user.password)
    if (!isValid) return c.json({error: 'Password is not true', errorMessage: '账户或密码不正确'}, 403)

    // 3. 生成accessToken
    const payload = {
        id: user.id,
        name: user.name,
        clientToken: input.clientToken,
        uuid: user.uuid,
    }
    const jwt = await generateJwt(payload, c.env.kv)

    const request = {
        accessToken: jwt,
        clientToken: input.clientToken,
        selectedProfile: {
                id: user.uuid,
                name: user.name,
            },
        ...(input.requestUser && {user: {id: user.id}})
    }

    return c.json(request)
})

authServer.post('/validate', zValidator('json', z.object({
    accessToken: z.string(),
    clientToken: z.string(),
})), async (c) => {
        const input = c.req.valid('json')
        const secret = await getSecret(c.env.kv)

        const payload = await verify(input.accessToken, secret, 'HS256')

        if (payload.type != 'mc') return c.json({error: 'ForbiddenOperationException', errorMessage: 'Invalid token.'})

        return c.body(null, 204)
    }
)