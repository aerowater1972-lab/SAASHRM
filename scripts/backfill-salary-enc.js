#!/usr/bin/env node
/**
 * Backfill salary_enc for existing Employment records.
 * Run after enabling SALARY_ENCRYPTION_ENABLED=true and setting DATA_ENCRYPTION_KEY.
 */

const { PrismaClient } = require('@prisma/client');
const { createCipheriv, randomBytes } = require('crypto');

const ALGO = 'aes-256-gcm';

function resolveKey() {
  const raw = process.env.DATA_ENCRYPTION_KEY;
  if (!raw || raw.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DATA_ENCRYPTION_KEY not configured (min 32 chars)');
    }
    console.warn('[security] Using dev-only key for backfill');
    return Buffer.from('dev-only-insecure-key-change-me!!'.padEnd(32, '0')).subarray(0, 32);
  }
  const buf = Buffer.from(raw);
  if (buf.length >= 32) return buf.subarray(0, 32);
  console.warn('[security] DATA_ENCRYPTION_KEY shorter than 32 bytes — padding');
  return Buffer.from(raw.padEnd(32, '0')).subarray(0, 32);
}

const KEY = resolveKey();

function encrypt(plain) {
  if (plain === undefined || plain === null) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, KEY, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const employments = await prisma.employment.findMany({
      where: { salaryEnc: null, salary: { not: null } },
      select: { id: true, salary: true },
    });

    console.log(`Found ${employments.length} employments to encrypt`);

    let updated = 0;
    for (const emp of employments) {
      const salaryEnc = encrypt(emp.salary);
      await prisma.employment.update({
        where: { id: emp.id },
        data: { salaryEnc, salary: null },
      });
      updated++;
      if (updated % 10 === 0) console.log(`  Encrypted ${updated}/${employments.length}`);
    }

    console.log(`Done. Updated ${updated} records.`);
  } catch (e) {
    console.error('Backfill failed:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();