import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

import type { Env } from '../type'
import { createDb } from "../db";
import {users} from "../db/schema";
import {eq} from "drizzle-orm";
import {sign} from "../utils/signature";
import {getSecret} from "../utils/secret";
import {verify} from "hono/jwt";
import {yggdrasilConfig} from '../../config';

export const sessionServer = new Hono<{ Bindings: Env }>()

const getProfileSchema = z.object({
    unsigned: z.boolean().optional()
})
sessionServer.get("/session/minecraft/profile/:uuid", zValidator('query', getProfileSchema), async (c) => {
    const uuid = c.req.param('uuid')
    let { unsigned } = c.req.valid('query');
    if (unsigned === undefined) unsigned = true

    const result = await getUserByUuid(uuid, c.env.db, c.env.kv, !unsigned)
    if (!('error' in result)) {
        return c.json(result)
    }

    return c.json({error: result.error})
})

const joinSchema = z.object({
    accessToken: z.string(),
    selectedProfile: z.string(),
    serverId: z.string(),
})
sessionServer.post("/session/minecraft/join", zValidator('json', joinSchema) ,async (c) => {
    try {
        const input = c.req.valid('json')
        const secret = await getSecret(c.env.kv)
        const payload = await verify(input.accessToken, secret, 'HS256')

        if (payload.type != 'mc') return c.json({error: 'FORBIDDEN', errorMessage: '你使用了不合规的token'}, 403)
        if (payload.uuid != input.selectedProfile) return c.json({error: 'ForbiddenOperationException', errorMessage: '令牌绑定不属于其对应用户的角色'},403)

        await c.env.kv.put(`ygg:serverid:${input.serverId}`, payload.uuid as string, {expirationTtl: yggdrasilConfig.joinServerExpirySeconds})
        return c.body(null, 204)
    } catch (error) {
        console.error('join verification failed:', error)
        return c.json({error: 'FORBIDDEN', errorMessage: '令牌验证失败'}, 403)
    }
})

const hasJoinSchema = z.object({
    username: z.string(),
    serverId: z.string(),
    ip: z.string().optional(),
})
sessionServer.get("/session/minecraft/hasJoined", zValidator('query', hasJoinSchema), async (c) => {
    const input = c.req.valid('query')
    console.debug(`serverId:${input.serverId}`)

    const uuid = await c.env.kv.get(`ygg:serverid:${input.serverId}`)
    if (uuid) {
        return c.json(await getUserByUuid(uuid, c.env.db, c.env.kv))
    }

    return c.json({error: 'not found'}, 403)
})


async function getUserByUuid(uuid: string, db: D1Database, kv: KVNamespace, needSignature = false) {
    const drizzle = createDb(db)

    const [user] = await drizzle
        .select()
        .from(users)
        .where(eq(users.uuid, uuid))

    if (!user) return {error: "No such user"}

    const textures = {
        timestamp: user.createdAt,
        profileId: user.uuid,
        profileName: user.name,
    }
    const texturesBase64 = btoa(JSON.stringify(textures))

    return {
        id: uuid,
        name: user.name,
        properties: [
            {
                name: 'textures',
                value: texturesBase64,
                ...(needSignature ? { signature: await sign(textures, kv) } : {})
            }
        ]
    }
}