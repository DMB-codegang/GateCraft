
export async function getSecret(kv: KVNamespace) {
    let secret = await kv.get('secret')
    if (!secret) {
        const bytes = new Uint8Array(32)
        crypto.getRandomValues(bytes)
        secret = btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''))
        await kv.put('secret', secret)
    }
    return secret
}
