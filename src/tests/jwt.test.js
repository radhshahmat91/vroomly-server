import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';
import { createTokenVerifier, extractBearer } from '../utils/jwt.js';

const ISSUER = 'http://localhost:3000';

async function makeKeys() {
  const { publicKey, privateKey } = await generateKeyPair('EdDSA', { crv: 'Ed25519', extractable: true });
  const jwk = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'EdDSA' };
  return { privateKey, keySet: createLocalJWKSet({ keys: [jwk] }) };
}

const sign = (privateKey, claims = {}, { issuer = ISSUER, audience = ISSUER, exp = '15m', kid = 'test-key' } = {}) =>
  new SignJWT(claims)
    .setProtectedHeader({ alg: 'EdDSA', kid })
    .setSubject('64b7f0c2e4b0a1a2b3c4d5e6')
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(privateKey);

describe('createTokenVerifier (BetterAuth JWTs)', () => {
  let privateKey;
  let verify;

  beforeAll(async () => {
    const keys = await makeKeys();
    privateKey = keys.privateKey;
    verify = createTokenVerifier({ issuer: ISSUER, keySet: keys.keySet });
  });

  test('accepts a valid token and returns its claims', async () => {
    const token = await sign(privateKey, { role: 'renter' });
    const payload = await verify(token);
    expect(payload.sub).toBe('64b7f0c2e4b0a1a2b3c4d5e6');
    expect(payload.role).toBe('renter');
  });

  test('rejects an expired token', async () => {
    const token = await sign(privateKey, {}, { exp: Math.floor(Date.now() / 1000) - 120 });
    await expect(verify(token)).rejects.toThrow();
  });

  test('rejects a token from another issuer', async () => {
    const token = await sign(privateKey, {}, { issuer: 'https://evil.example', audience: ISSUER });
    await expect(verify(token)).rejects.toThrow();
  });

  test('rejects a token for another audience', async () => {
    const token = await sign(privateKey, {}, { audience: 'https://someone-else.example' });
    await expect(verify(token)).rejects.toThrow();
  });

  test('rejects a token signed with an unknown key', async () => {
    const other = await generateKeyPair('EdDSA', { crv: 'Ed25519' });
    const token = await sign(other.privateKey);
    await expect(verify(token)).rejects.toThrow();
  });

  test('rejects a tampered token', async () => {
    const token = await sign(privateKey);
    const [h, p, s] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ sub: 'admin', iss: ISSUER, aud: ISSUER, exp: 9999999999 })).toString('base64url');
    await expect(verify(`${h}.${forged}.${s}`)).rejects.toThrow();
    expect(p).toBeTruthy();
  });
});

describe('extractBearer', () => {
  test('reads a Bearer header', () => {
    expect(extractBearer('Bearer abc.def.ghi')).toBe('abc.def.ghi');
    expect(extractBearer('bearer   abc')).toBeNull(); // malformed spacing
    expect(extractBearer('Basic abc')).toBeNull();
    expect(extractBearer(undefined)).toBeNull();
  });
});
