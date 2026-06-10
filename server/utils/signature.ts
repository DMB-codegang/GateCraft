
const KV_KEY_PRIVATE = 'rsa_private_jwk'
const KV_KEY_PUBLIC = 'rsa_public_jwk'

const ALGORITHM = {
  name: 'RSASSA-PKCS1-v1_5',
  modulusLength: 2048,
  publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
  hash: 'SHA-1',
} as const

/**
 * 确保 RSA 密钥对存在于 KV 中，不存在则自动生成并存储。
 * @param kv - Cloudflare Workers 的 KVNamespace 绑定
 * @returns 包含私钥和公钥的 CryptoKeyPair
 */
async function ensureKeys(kv: KVNamespace): Promise<CryptoKeyPair> {
  const storedPrivateJwk = await kv.get(KV_KEY_PRIVATE)
  const storedPublicJwk = await kv.get(KV_KEY_PUBLIC)

  if (storedPrivateJwk && storedPublicJwk) {
    const privateKey = await crypto.subtle.importKey(
      'jwk',
      JSON.parse(storedPrivateJwk),
      { name: ALGORITHM.name, hash: ALGORITHM.hash },
      false,
      ['sign'],
    )
    const publicKey = await crypto.subtle.importKey(
      'jwk',
      JSON.parse(storedPublicJwk),
      { name: ALGORITHM.name, hash: ALGORITHM.hash },
      true,
      ['verify'],
    )
    return { privateKey, publicKey }
  }

  // 生成新密钥对并存入 KV
  const keyPair = (await crypto.subtle.generateKey(
    ALGORITHM,
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair

  const privateJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey)
  const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)

  await kv.put(KV_KEY_PRIVATE, JSON.stringify(privateJwk))
  await kv.put(KV_KEY_PUBLIC, JSON.stringify(publicJwk))

  return keyPair
}

/**
 * 将 ArrayBuffer 转换为 Base64 字符串。
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}

/**
 * 获取 RSA 公钥，返回 PEM 格式字符串。
 * 格式：-----BEGIN PUBLIC KEY-----\n(base64)\n-----END PUBLIC KEY-----\n
 * Base64 内容按 64 字符换行。
 * @param kv - Cloudflare Workers 的 KVNamespace 绑定
 * @returns PEM 格式的公钥字符串
 *
 * @example
 * ```ts
 * const publicKey = await getPublicKey(kv)
 * ```
 */
export async function getPublicKey(kv: KVNamespace): Promise<string> {
  const { publicKey } = await ensureKeys(kv)
  const spki = (await crypto.subtle.exportKey('spki', publicKey)) as ArrayBuffer
  const base64 = arrayBufferToBase64(spki)
  const lines = base64.match(/.{1,64}/g) ?? []
  return `-----BEGIN PUBLIC KEY-----\n${lines.join('\n')}\n-----END PUBLIC KEY-----`
}

/**
 * 使用 RSA 私钥对 JSON 数据进行签名（SHA1withRSA），返回 Base64 编码的签名。
 * 若 KV 中不存在密钥对，会自动创建。
 * @param data - 需要签名的 JSON 对象
 * @param kv - Cloudflare Workers 的 KVNamespace 绑定
 * @returns Base64 编码的签名字符串
 *
 * @example
 * ```ts
 * const signature = await sign({ foo: 'bar' }, kv)
 * ```
 */
export async function sign(data: Object, kv: KVNamespace): Promise<string> {
  try {
    const { privateKey } = await ensureKeys(kv);
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    const signature = await crypto.subtle.sign(
      ALGORITHM.name, 
      privateKey, 
      encoded
    );
    return arrayBufferToBase64(signature);
  } catch (error) {
    throw new Error(`签名失败: ${error}`);
  }
}
