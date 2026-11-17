import dns from 'node:dns';
import mongoose from 'mongoose';
import { env } from './env.js';
import { resolveMongoUri } from '../utils/mongoUri.js';

function applyDnsOverride() {
  const servers = (env.DNS_SERVERS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (servers.length) {
    dns.setServers(servers);
    console.log(`[db] using DNS servers ${servers.join(', ')} for MongoDB lookups`);
  }
}

const SRV_HELP = `
  Node could not resolve your MongoDB Atlas address (a "mongodb+srv://" DNS SRV lookup failed).
  This is a network/DNS problem, not a bug in the app. Fix it with ONE of these:
    1. Add  DNS_SERVERS=8.8.8.8,1.1.1.1  to this .env file and restart.
    2. Change your computer's DNS to 8.8.8.8 / 1.1.1.1 (or try a phone hotspot / turn off the VPN).
    3. In Atlas choose Connect > Drivers > Node.js "2.2.12 or later" and use the long "mongodb://host1,host2,host3/..." string.
    4. Develop against a local MongoDB (docker compose up -d) and keep Atlas for deployment.
  Run  npm run check-db  to see exactly which step is failing.
`;

export async function connectDB() {
  mongoose.set('strictQuery', true);
  applyDnsOverride();

  // If this network refuses SRV lookups, fall back to resolving the Atlas address over HTTPS.
  const resolved = await resolveMongoUri(env.MONGODB_URI);
  if (resolved.method === 'doh') {
    console.log(`[db] your DNS refused the Atlas SRV lookup (${resolved.systemError?.code ?? 'error'}); resolved it over HTTPS instead`);
  } else if (resolved.method === 'failed') {
    console.error(`[db] could not resolve the Atlas address (${resolved.systemError?.code ?? resolved.systemError?.message}), and the HTTPS fallback failed too (${resolved.dohError?.message}).`);
    console.error(SRV_HELP);
  }

  try {
    await mongoose.connect(resolved.uri, {
      dbName: env.MONGODB_DB || undefined,
      serverSelectionTimeoutMS: 15000,
    });
  } catch (err) {
    if (/ENOTFOUND|ECONNREFUSED|querySrv/i.test(err?.message || '')) console.error(SRV_HELP);
    throw err;
  }
  console.log(`[db] connected to "${mongoose.connection.name}"`);
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
