
import {Hono} from "hono";
import {updateSignal} from "./updateSignal";
import type { Env } from '../../../type'

export const railwayRoutes = new Hono<{ Bindings: Env }>()

railwayRoutes.get('/updateSignal', updateSignal)