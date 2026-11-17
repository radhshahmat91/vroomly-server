import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

const bool = z
  .string()
  .optional()
  .transform((v) => v === 'true' || v === '1');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  MONGODB_DB: z.string().optional(),
  // Optional: comma separated DNS servers (e.g. 8.8.8.8,1.1.1.1) for networks whose DNS refuses SRV lookups.
  DNS_SERVERS: z.string().optional(),
  // Comma separated list of browser origins allowed to call this API.
  CLIENT_URL: z.string().default('http://localhost:3000'),
  // Where BetterAuth runs (the Next.js app). Its JWKS endpoint is used to verify JWTs.
  AUTH_URL: z.string().default('http://localhost:3000'),
  AUTH_JWKS_URL: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  PLATFORM_COMMISSION: z.coerce.number().min(0).max(0.5).default(0.1),
  DEMO_PAYMENTS: bool,
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  process.exit(1);
}

const clean = (url) => url.replace(/\/+$/, '');
const data = parsed.data;

export const env = {
  ...data,
  isProd: data.NODE_ENV === 'production',
  CLIENT_ORIGINS: data.CLIENT_URL.split(',').map((s) => clean(s.trim())).filter(Boolean),
  AUTH_URL: clean(data.AUTH_URL),
  AUTH_JWKS_URL: data.AUTH_JWKS_URL || `${clean(data.AUTH_URL)}/api/auth/jwks`,
};
