import {handleCallback as qqCallback} from './qq'
import {Hono} from "hono";

export const oauthRoutes = new Hono<{ Bindings: Env }>()

oauthRoutes.get('/qq/callback', qqCallback)
