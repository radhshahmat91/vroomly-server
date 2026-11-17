/**
 * npm run check-db — finds out why the database connection fails, step by step.
 */
import dns from 'node:dns';
import net from 'node:net';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { buildStandardUri, dohQuery, resolveMongoUri } from '../utils/mongoUri.js';

const ok = (m) => console.log(`  ✔ ${m}`);
const bad = (m) => console.log(`  ✘ ${m}`);
const mask = (uri) => uri.replace(/\/\/([^:@/]+):[^@]*@/, '//$1:****@');

const servers = (env.DNS_SERVERS || '').split(',').map((s) => s.trim()).filter(Boolean);
if (servers.length) dns.setServers(servers);

const tcp = (host, port) =>
  new Promise((resolve) => {
    const socket = net.connect({ host, port, timeout: 6000 });
    socket.once('connect', () => { socket.destroy(); resolve(null); });
    socket.once('timeout', () => { socket.destroy(); resolve('timed out'); });
    socket.once('error', (e) => resolve(e.code || e.message));
  });

async function main() {
  console.log('\nVroomly database check\n');
  console.log(`1. Connection string: ${mask(env.MONGODB_URI)}`);
  console.log(`   database name:     ${env.MONGODB_DB || '(from the connection string)'}`);

  let uri = env.MONGODB_URI;
  let hosts = [];
  if (uri.startsWith('mongodb+srv://')) {
    const host = new URL(uri).hostname;
    console.log('\n2. DNS lookup of the Atlas address (SRV record)');
    let viaSystem = false;
    try {
      const records = await dns.promises.resolveSrv(`_mongodb._tcp.${host}`);
      ok(`your DNS answered: ${records.map((r) => r.name).join(', ')}`);
      hosts = records.map((r) => `${r.name}:${r.port}`);
      viaSystem = true;
    } catch (err) {
      bad(`your DNS refused it (${err.code || err.message}). This is the "querySrv" error.`);
    }
    if (!viaSystem) {
      try {
        const srv = await dohQuery(`_mongodb._tcp.${host}`, 'SRV');
        const txt = await dohQuery(host, 'TXT').catch(() => []);
        uri = buildStandardUri(uri, srv, txt);
        hosts = srv.map((d) => { const [, , port, target] = d.split(/\s+/); return `${target.replace(/\.$/, '')}:${port}`; });
        ok(`resolved over HTTPS instead: ${hosts.join(', ')}`);
        console.log('     The app now uses this automatically, so you can carry on.');
      } catch (err) {
        bad(`the HTTPS fallback failed too (${err.message}). Is there internet access / a proxy?`);
        console.log('\n  → Use a local MongoDB for development: run `docker compose up -d` in the project root,');
        console.log('    then set MONGODB_URI=mongodb://127.0.0.1:27017/vroomly in BOTH .env files.');
        return;
      }
    }
  } else {
    hosts = (uri.match(/mongodb:\/\/(?:[^@/]*@)?([^/?]+)/)?.[1] ?? '').split(',').filter(Boolean);
  }

  console.log('\n3. Reaching the database servers (TCP)');
  let reachable = 0;
  for (const h of hosts) {
    const [host, port] = h.split(':');
    const err = await tcp(host, Number(port || 27017));
    if (err) bad(`${h}: ${err}`); else { ok(`${h} is reachable`); reachable += 1; }
  }
  if (!reachable) {
    console.log('\n  → Port 27017 is blocked on this network (some ISPs and campus networks do this).');
    console.log('    Try a phone hotspot, or develop against a local MongoDB (docker compose up -d).');
    return;
  }

  console.log('\n4. Logging in and pinging the database');
  try {
    await mongoose.connect(uri, { dbName: env.MONGODB_DB || undefined, serverSelectionTimeoutMS: 15000 });
    await mongoose.connection.db.admin().ping();
    ok(`connected to "${mongoose.connection.name}"`);
    const users = await mongoose.connection.db.collection('user').countDocuments({ email: /@vroomly\.app$/i });
    console.log(users ? `  ✔ ${users} demo accounts found — login with the demo accounts will work.` : '  ! No demo accounts yet — run  npm run seed  to create them.');
  } catch (err) {
    bad(err.message);
    if (/auth|credentials|bad auth/i.test(err.message)) console.log('\n  → Wrong username or password. Special characters in the password must be URL-encoded (@ → %40, # → %23, / → %2F).');
    else if (/whitelist|IP|not allowed|timed out|Server selection/i.test(err.message)) console.log('\n  → In Atlas open Network Access and add your IP address (or 0.0.0.0/0 while developing). Also check the cluster is not paused.');
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
