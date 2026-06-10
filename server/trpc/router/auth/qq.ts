import { router, publicProcedure} from '../../trpc'

export const qq = router({
    getState: publicProcedure.query(async ({ctx}) => {
        const bytes = new Uint8Array(32)
        crypto.getRandomValues(bytes)
        const state = btoa(String.fromCharCode(...bytes))
        await ctx.kv.put(`qq_state_${state}`, ctx.host, {expirationTtl: 5*60})

        return {
            response_type: 'code',
            client_id: ctx.env.QQ_APP_ID,
            redirect_uri: `https://mcmtrdy.codegang.top/api/oauth/qq/callback`,
            state,
        }
    })
})