import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';
const RAW_KEY = process.env.DATA_ENCRYPTION_KEY || 'dev-only-insecure-key-change-me!!';
const KEY = Buffer.from(RAW_KEY).length >= 32 ? Buffer.from(RAW_KEY).subarray(0, 32) : Buffer.from(RAW_KEY.padEnd(32, '0'));

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
