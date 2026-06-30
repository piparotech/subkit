/**
 * A dependency-free AWS Signature V4 query presigner for S3-compatible storage (AWS S3, Hetzner
 * Object Storage, MinIO, Cloudflare R2, …). Implemented purely on Web Crypto (`crypto.subtle`), so it
 * is isomorphic (bun, node, browser) and pulls in NO vendor SDK.
 *
 * It produces presigned GET/PUT/DELETE URLs whose validity is bounded by `X-Amz-Expires` — a granted
 * URL is the only access path to an object and it stops working when it expires (acceptance: only a
 * valid, expiring presigned URL grants access). The provider is reached only through the
 * `StoragePresigner` interface in ./uploads-storage, so swapping S3 ↔ MinIO ↔ R2 is a config change,
 * never an API change (acceptance: provider switch keeps the flow working).
 */

const ALGORITHM = 'AWS4-HMAC-SHA256'
const SERVICE = 's3'
const UNSIGNED_PAYLOAD = 'UNSIGNED-PAYLOAD'

export type S3Credentials = {
  accessKeyId: string
  secretAccessKey: string
  sessionToken?: string
}

export type S3Endpoint = {
  /** Base endpoint, e.g. `https://s3.eu-central-1.amazonaws.com` or `http://127.0.0.1:9000` (MinIO). */
  endpoint: string
  region: string
  bucket: string
  /**
   * Path-style addressing (`<endpoint>/<bucket>/<key>`) vs virtual-hosted
   * (`<bucket>.<host>/<key>`). MinIO + most self-hosted require path-style; AWS supports both.
   */
  forcePathStyle: boolean
}

export type PresignInput = {
  method: 'GET' | 'PUT' | 'DELETE'
  key: string
  expiresInSeconds: number
  /** Extra headers folded into the signature (e.g. `content-type` for a PUT). */
  signedHeaders?: Record<string, string>
  /** Clock injection for deterministic tests. Defaults to `new Date()`. */
  now?: Date
}

const encoder = new TextEncoder()

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

async function sha256Hex(data: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', encoder.encode(data)))
}

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data))
}

/** RFC 3986 encode, but keep `/` in object keys (each segment is encoded individually upstream). */
function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  )
}

function encodeKey(key: string): string {
  return key
    .split('/')
    .map((segment) => encodeRfc3986(segment))
    .join('/')
}

function amzDate(now: Date): { date: string; dateTime: string } {
  const dateTime = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  return { date: dateTime.slice(0, 8), dateTime }
}

async function signingKey(secret: string, date: string, region: string): Promise<ArrayBuffer> {
  const kDate = await hmac(encoder.encode(`AWS4${secret}`), date)
  const kRegion = await hmac(kDate, region)
  const kService = await hmac(kRegion, SERVICE)
  return hmac(kService, 'aws4_request')
}

/**
 * Build a presigned URL for one object operation. The returned URL embeds the signature in the query
 * string and is valid for exactly `expiresInSeconds`.
 */
export async function presignS3Url(
  endpoint: S3Endpoint,
  credentials: S3Credentials,
  input: PresignInput,
): Promise<string> {
  const now = input.now ?? new Date()
  const { date, dateTime } = amzDate(now)

  const url = new URL(endpoint.endpoint)
  const host = endpoint.forcePathStyle ? url.host : `${endpoint.bucket}.${url.host}`
  const basePath = endpoint.forcePathStyle ? `/${endpoint.bucket}` : ''
  const canonicalUri = `${basePath}/${encodeKey(input.key)}`

  const extraHeaders = input.signedHeaders ?? {}
  const headerNames = Object.keys(extraHeaders)
    .map((name) => name.toLowerCase())
    .sort()
  const signedHeaderList = ['host', ...headerNames].sort()
  const signedHeaders = signedHeaderList.join(';')

  const credentialScope = `${date}/${endpoint.region}/${SERVICE}/aws4_request`
  const query: Record<string, string> = {
    'X-Amz-Algorithm': ALGORITHM,
    'X-Amz-Credential': `${credentials.accessKeyId}/${credentialScope}`,
    'X-Amz-Date': dateTime,
    'X-Amz-Expires': String(input.expiresInSeconds),
    'X-Amz-SignedHeaders': signedHeaders,
  }
  if (credentials.sessionToken) query['X-Amz-Security-Token'] = credentials.sessionToken

  const canonicalQuery = Object.keys(query)
    .sort()
    .map((k) => `${encodeRfc3986(k)}=${encodeRfc3986(query[k] as string)}`)
    .join('&')

  const headerMap: Record<string, string> = { host, ...lowerKeys(extraHeaders) }
  const canonicalHeaders = signedHeaderList.map((name) => `${name}:${headerMap[name]}\n`).join('')

  const canonicalRequest = [
    input.method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    UNSIGNED_PAYLOAD,
  ].join('\n')

  const stringToSign = [
    ALGORITHM,
    dateTime,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join('\n')

  const key = await signingKey(credentials.secretAccessKey, date, endpoint.region)
  const signature = toHex(await hmac(key, stringToSign))

  return `${url.protocol}//${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`
}

function lowerKeys(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [name, value] of Object.entries(headers)) out[name.toLowerCase()] = value.trim()
  return out
}
