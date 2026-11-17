import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/apiError.js';
import { createTokenVerifier, extractBearer } from '../utils/jwt.js';

let verifier;
const getVerifier = () => (verifier ??= createTokenVerifier({ issuer: env.AUTH_URL, jwksUrl: env.AUTH_JWKS_URL }));

/** Verify a BetterAuth JWT and load the matching marketplace user. Throws ApiError on any problem. */
export async function authenticateToken(token) {
  let payload;
  try {
    payload = await getVerifier()(token);
  } catch (err) {
    if (!env.isProd) console.warn('[auth] token rejected:', err?.code || err?.message);
    throw new ApiError(401, 'Your session has expired. Please sign in again.', { code: 'TOKEN_INVALID' });
  }
  if (!mongoose.isValidObjectId(payload.sub)) throw new ApiError(401, 'Your session is not valid. Please sign in again.');

  const user = await User.findById(payload.sub);
  if (!user) throw new ApiError(401, 'We could not find your account. Please sign in again.');
  if (user.status === 'suspended') {
    throw new ApiError(403, 'Your account has been suspended. Contact support if you think this is a mistake.', {
      code: 'ACCOUNT_SUSPENDED',
    });
  }
  return user;
}

export async function requireAuth(req, _res, next) {
  const token = extractBearer(req.headers.authorization);
  if (!token) throw new ApiError(401, 'Please sign in to continue.', { code: 'AUTH_REQUIRED' });
  req.user = await authenticateToken(token);
  next();
}

/** Attaches req.user when a valid token is present, otherwise carries on anonymously. */
export async function optionalAuth(req, _res, next) {
  const token = extractBearer(req.headers.authorization);
  req.user = null;
  if (token) {
    try {
      req.user = await authenticateToken(token);
    } catch {
      req.user = null;
    }
  }
  next();
}

export const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, 'You do not have permission to do that.', { code: 'FORBIDDEN' });
    }
    next();
  };

export const requireHost = requireRole('owner');
export const requireAdmin = requireRole('admin');
