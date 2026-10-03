import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';

function resolveKey(): Buffer {
  const raw = process.env.DATA_ENCRYPTION_KEY;
  if (!raw || raw.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'DATA_ENCRYPTION_KEY is not configured (min 32 chars). Refusing to start in production with insecure fallback.',
      );
    }
    // Dev/test only: derive a deterministic non-secret key and warn loudly.
    // eslint-disable-next-line no-console
    console.warn('[security] DATA_ENCRYPTION_KEY missing — using dev-only key. Set it before production.');
    return Buffer.from('dev-only-insecure-key-change-me!!'.padEnd(32, '0')).subarray(0, 32);
  }
  const buf = Buffer.from(raw);
  if (buf.length >= 32) return buf.subarray(0, 32);
  // Pad short keys deterministically (still warn: use >=32 chars).
  // eslint-disable-next-line no-console
  console.warn('[security] DATA_ENCRYPTION_KEY shorter than 32 bytes — padding. Use a 32+ char secret.');
  return Buffer.from(raw.padEnd(32, '0')).subarray(0, 32);
}

const KEY = resolveKey();

function toB64(buf: Buffer): string {
  return buf.toString('base64');
}

export function encrypt(plain?: string | null): string | null {
  if (plain === undefined || plain === null) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return toB64(Buffer.concat([iv, tag, enc]));
}

export function decrypt(cipherText?: string | null): string | null {
  if (!cipherText) return null;
  const buf = Buffer.from(cipherText, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}
