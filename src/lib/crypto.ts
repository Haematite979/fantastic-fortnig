import crypto from 'crypto'

/**
 * Encryption utility for storing OPay API credentials at rest.
 *
 * Uses AES-256-GCM (authenticated encryption) — secrets are encrypted with a
 * key derived from the ENCRYPTION_KEY environment variable. The ciphertext,
 * IV, and auth tag are stored together as a single hex string.
 *
 * Security notes:
 * - The encryption key NEVER leaves the server.
 * - Decrypted secrets only live in memory for the duration of an API call.
 * - The client always receives a masked preview (e.g. "OPAY••••1234") and
 *   never the plaintext secret.
 */

const ALGO = 'aes-256-gcm'
const IV_LENGTH = 12 // GCM standard recommends 96-bit IV

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw || raw.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY must be set to a 64+ char hex string in production')
    }
    return crypto.scryptSync('lead-fix-dev-fallback-key', 'lead-fix-salt', 32)
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex')
  return crypto.scryptSync(raw, 'lead-fix-salt', 32)
}

export function encrypt(plaintext: string): string {
  if (!plaintext) return ''
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [iv, authTag, encrypted].map((b) => b.toString('hex')).join(':')
}

export function decrypt(payload: string): string {
  if (!payload) return ''
  const parts = payload.split(':')
  if (parts.length !== 3) throw new Error('Invalid ciphertext format')
  const [ivHex, authTagHex, encryptedHex] = parts
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]).toString('utf8')
}

/** Returns a masked preview like "OPAY••••••••7890" */
export function maskSecret(secret: string): string {
  if (!secret) return ''
  if (secret.length <= 8) return '••••'
  const head = secret.slice(0, 4)
  const tail = secret.slice(-4)
  return `${head}${'•'.repeat(Math.min(secret.length - 8, 12))}${tail}`
}
