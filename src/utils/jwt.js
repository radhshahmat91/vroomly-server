import { createRemoteJWKSet, jwtVerify } from 'jose';

/**
 * Builds a function that verifies the JWTs BetterAuth issues (EdDSA signed, public keys published at /api/auth/jwks).
 * `keySet` can be injected for tests; in production keys are fetched (and cached) from `jwksUrl`.
 */
export function createTokenVerifier({ issuer, audience = issuer, jwksUrl, keySet }) {
  const keys = keySet ?? createRemoteJWKSet(new URL(jwksUrl), { cooldownDuration: 10_000, timeoutDuration: 8_000 });

  return async function verifyToken(token) {
    const { payload } = await jwtVerify(token, keys, { issuer, audience, clockTolerance: 5 });
    if (!payload.sub) throw new Error('Token has no subject');
    return payload;
  };
}

export function extractBearer(header = '') {
  const [scheme, token] = String(header).split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token.trim() : null;
}
