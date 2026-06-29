import { createHash, randomBytes } from 'node:crypto'

export function createRandomToken(byteLength = 32): string {
  return base64UrlEncode(randomBytes(byteLength))
}

export function createCodeVerifier(): string {
  return createRandomToken(48)
}

export function createCodeChallenge(verifier: string): string {
  return base64UrlEncode(createHash('sha256').update(verifier).digest())
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function base64UrlEncode(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

export function base64UrlDecode(value: string): Buffer {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), '=')
  const base64 = padded.replaceAll('-', '+').replaceAll('_', '/')
  return Buffer.from(base64, 'base64')
}
