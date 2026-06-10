import { Hono } from 'hono'
import type { Env } from '../type'
import { authServer } from './user'
import { config } from "../../config";
import {sessionServer} from "./session";
import { getPublicKey } from "../utils/signature";



export const yggdrasil = new Hono<{ Bindings: Env }>()

yggdrasil.use('*', async (c,next) => {
    console.log(`请求路径${c.req.path}`)
    await next()
})

yggdrasil.get('/', async (c) => {
    console.log('Yggdrasil server running')
    const host = new URL(c.req.url).host
    return c.json({
        meta: {
            serverName: config.serverName,
            links: {
                homepage: `${host}/`,
                register: `${host}/register`
            },
            "feature.non_email_login": true
        },
        signaturePublickey: await getPublicKey(c.env.kv)
    })
})

yggdrasil.route('/authserver', authServer)
yggdrasil.route('/sessionserver', sessionServer)