import { Hono } from 'hono'
import type { Env } from '../../type'
import {railwayRoutes} from './railway'

export const mc = new Hono<{ Bindings: Env }>()

mc.route('/railway', railwayRoutes)
