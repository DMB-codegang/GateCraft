import {handleCallback as qqCallback} from './qq'
import {Hono} from "hono";
import type { Env } from '../../type'

export const oauthRoutes = new Hono<{ Bindings: Env }>()

oauthRoutes.get('/qq/callback', qqCallback)
