import type { Context } from 'hono'

import {createUserById, findUserById, generateJwt, redirectWithToken, validateState} from './utils'
import type { Env } from '../../type'

/** QQ OAuth token 接口返回的数据结构 */
interface QQTokenResponse {
  access_token: string
  expires_in: number
  openid: string
  refresh_token: string
}

/** QQ unionID 接口返回的数据结构 */
interface QQUserUnionIdResponse {
  client_id: string
  openid: string
  unionid: string
}

/** QQ 用户信息接口返回的数据结构 */
interface QQUserInfo {
  ret: number;
  msg: string;
  is_lost: number;
  nickname: string;
  gender: string;
  gender_type: number;
  province: string;
  city: string;
  year: string;
  figureurl: string;
  figureurl_1: string;
  figureurl_2: string;
  figureurl_qq_1: string;
  figureurl_qq_2: string;
  figureurl_qq: string;
  is_yellow_vip: string;
  vip: string;
  yellow_vip_level: string;
  level: string;
  is_yellow_year_vip: string;
}

/**
 * QQ OAuth 登录回调处理
 *
 * 完整的 QQ 第三方登录回调流程：
 * 1. 校验 code 和 state 参数
 * 2. 用 code 换取 access_token 和 OpenID
 * 3. 获取 QQ 用户信息（昵称、头像）
 * 4. 查找或创建本地用户
 * 5. 签发 JWT 并重定向回前端
 *
 * @param c - Hono 上下文，包含请求信息和环境绑定
 * @returns 成功时返回 302 重定向到前端登录页；失败时返回错误文本
 */
export async function handleCallback(c: Context<{ Bindings: Env }>) {
  const env = c.env
  const { code, state } = c.req.query()

  // 参数校验
  if (!code || !state) {
    return c.text('Missing code or state', 400)
  }

  // 校验 state，防止 CSRF 攻击
  const host = await validateState(env.kv, 'qq', state)
  if (!host) {
    return c.text('Invalid or expired state', 400)
  }

  const redirectUri = `https://${host}/api/oauth/qq/callback`

  // 第一步：用授权码换取 access_token并获取 OpenID
  let tokenData: QQTokenResponse
  try {
    const tokenUrl = new URL('https://graph.qq.com/oauth2.0/token')
    tokenUrl.searchParams.set('grant_type', 'authorization_code')
    tokenUrl.searchParams.set('client_id', env.QQ_APP_ID)
    tokenUrl.searchParams.set('client_secret', env.QQ_APP_KEY)
    tokenUrl.searchParams.set('code', code)
    tokenUrl.searchParams.set('redirect_uri', redirectUri)
    tokenUrl.searchParams.set('fmt', 'json')
    tokenUrl.searchParams.set('need_openid', '1')

    const tokenRes = await fetch(tokenUrl.toString())
    const tokenText = await tokenRes.text()

    console.debug('向QQ申请access_token：', tokenText)

    try {
      tokenData = JSON.parse(tokenText) as QQTokenResponse
    } catch {
      console.error('Token exchange failed:', tokenText)
      return c.text(`Token exchange failed: ${tokenText}`, 500)
    }

    if (!tokenData.access_token) {
      console.error('Token exchange failed: no access_token')
      return c.text(`Token exchange failed: no access_token`, 500)
    }
  } catch (err) {
    console.error('Token exchange error:', err)
    return c.text(`Token exchange error: ${String(err)}`, 500)
  }

  // 第二步：获取用户 UnionID
  let userUnionId;
  try {
    const userUnionIdUrl = new URL('https://graph.qq.com/oauth2.0/me')
    userUnionIdUrl.searchParams.set('access_token', tokenData.access_token)
    userUnionIdUrl.searchParams.set('unionid', '1')
    userUnionIdUrl.searchParams.set('fmt', 'json')

    const userUnionIdRes = await fetch(userUnionIdUrl.toString())
    userUnionId = ((await userUnionIdRes.json()) as QQUserUnionIdResponse).unionid
    console.debug('获取到用户union ID:', userUnionId)
  } catch (error) {
    console.error('Token exchange error:', error)
    return c.text(`Get union ID error: ${String(error)}`, 500)
  }

  // 第三步：查询用户是否存在
  let user = await findUserById(env.db, 'qq', userUnionId)
  console.debug(`从数据库比较得到用户：${user}`)
  if (!user) {
    // 如果用户不存在，获取qq用户的信息存入数据库
    const userInfoUrl = new URL('https://graph.qq.com/user/get_user_info')
    userInfoUrl.searchParams.set('access_token', tokenData.access_token)
    userInfoUrl.searchParams.set('oauth_consumer_key', env.QQ_APP_ID)
    userInfoUrl.searchParams.set('openid', tokenData.openid)

    const userInfoRes = await fetch(userInfoUrl.toString())
    const userInfo = (await userInfoRes.json()) as QQUserInfo
    console.debug('用户信息：', userInfo)

    await createUserById(env.db, 'qq', {
      id: userUnionId,
      nickname: userInfo.nickname,
      avatar: userInfo.figureurl_qq_2
    })
  }

  // 第四步：签发 JWT 并重定向
  const token = await generateJwt({name: user ? user.name : userUnionId, role: 'user'}, env)

  return redirectWithToken(host, token)
}
