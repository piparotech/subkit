import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

import { parseServerEnv, resolveSecretEncryptionKey } from './env'

interface EncryptedSecret {
  authTag: string
  ciphertext: string
  iv: string
}

function encryptionKey(): Buffer {
  const env = parseServerEnv(process.env)
  return createHash('sha256').update(resolveSecretEncryptionKey(env)).digest()
}

export function fingerprintSecret(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function encryptSecret(value: string): EncryptedSecret {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return {
    authTag: authTag.toString('base64url'),
    ciphertext: ciphertext.toString('base64url'),
    iv: iv.toString('base64url'),
  }
}

export function decryptSecret(secret: EncryptedSecret): string {
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(secret.iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(secret.authTag, 'base64url'))
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(secret.ciphertext, 'base64url')),
    decipher.final(),
  ])
  return plaintext.toString('utf8')
}
