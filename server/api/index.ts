import { Hono } from 'hono'

import { oauthRoutes } from './oauth'
import { mc } from './mc'

import type { Env } from '../type'

/**
 * API 路由入口
 *
 * 挂载所有子路由，对外暴露统一的 API 端点。
 * 当前包含：
 * - /api/oauth - OAuth 第三方登录相关路由
 */
export const api = new Hono<{ Bindings: Env }>()

api.route('/oauth', oauthRoutes)
api.route('/mc', mc)