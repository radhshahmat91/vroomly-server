import { randomBytes, scrypt } from 'node:crypto';

/**
 * Same scrypt parameters BetterAuth uses for email + password accounts, so users created by the
 * seed script can sign in through the Next.js app. (Format: "<salt hex>:<derived key hex>".)
 */
const N = 16384;
const R = 16;
const P = 1;
const KEY_LEN = 64;

const derive = (password, salt) =>
  new Promise((resolve, reject) => {
    scrypt(password.normalize('NFKC'), salt, KEY_LEN, { N, r: R, p: P, maxmem: 128 * N * R * 2 }, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${(await derive(password, salt)).toString('hex')}`;
}

export async function verifyPassword(hash, password) {
  const [salt, key] = hash.split(':');
  if (!salt || !key) return false;
  return (await derive(password, salt)).toString('hex') === key;
}
