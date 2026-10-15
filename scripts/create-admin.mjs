#!/usr/bin/env node
/**
 * Creates (or resets the password of) an admin console account in Firestore.
 *
 *   node scripts/create-admin.mjs bassem@sciencewerx.org            # random password, printed once
 *   ADMIN_NEW_PASSWORD='…' node scripts/create-admin.mjs <email>      # chosen password
 *
 * Targets the project in GOOGLE_CLOUD_PROJECT (or FIRESTORE_EMULATOR_HOST) using
 * Application Default Credentials. Hash format matches src/lib/passwords.ts.
 */
import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes('@')) {
  console.error('Usage: node scripts/create-admin.mjs <email>');
  process.exit(1);
}
const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
if (!projectId) {
  console.error('Set GOOGLE_CLOUD_PROJECT (e.g. i-startup-26124).');
  process.exit(1);
}

const password = process.env.ADMIN_NEW_PASSWORD || randomBytes(15).toString('base64url');
if (password.length < 12) {
  console.error('Use a password of at least 12 characters.');
  process.exit(1);
}
const salt = randomBytes(16);
const key = await promisify(scrypt)(password, salt, 64, { N: 16384, r: 8, p: 1 });
const passwordHash = `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;

const db = getFirestore(initializeApp({ projectId }));
const ref = db.collection('istartup_admins').doc(encodeURIComponent(email));
const existing = await ref.get();
const now = new Date().toISOString();
await ref.set(
  {
    email,
    password_hash: passwordHash,
    updated_at: now,
    ...(existing.exists ? {} : { created_at: now, last_login_at: null }),
  },
  { merge: true },
);

console.log(`${existing.exists ? 'Reset password for' : 'Created'} admin ${email} in ${projectId}.`);
if (!process.env.ADMIN_NEW_PASSWORD) console.log(`Password: ${password}`);
