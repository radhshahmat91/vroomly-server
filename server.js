import dns from "node:dns";
dns.setServers(["1.1.1.1", "8.8.8.8"]);

import http from 'node:http';
import { createApp } from './src/app.js';
import { connectDB, disconnectDB } from './src/config/db.js';
import { env } from './src/config/env.js';
import { demoPaymentsEnabled, stripe } from './src/config/stripe.js';
import { cloudinaryReady } from './src/config/cloudinary.js';
import { initSocket } from './src/sockets/index.js';
import { sweepBookings } from './src/utils/bookingSweeper.js';

async function main() {
  await connectDB();

  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);

  server.listen(env.PORT, () => {
    console.log(`[server] Vroomly API listening on http://localhost:${env.PORT}`);
    console.log(`[server] allowed origins: ${env.CLIENT_ORIGINS.join(', ')}`);
    console.log(`[server] verifying JWTs from ${env.AUTH_JWKS_URL}`);
    console.log(
      `[server] stripe: ${stripe ? 'live keys loaded' : demoPaymentsEnabled ? 'DEMO payments (no Stripe key)' : 'not configured'} | cloudinary: ${cloudinaryReady ? 'ready' : 'not configured'}`,
    );
  });

  const sweep = () =>
    sweepBookings()
      .then((r) => (r.completed || r.expired) && console.log('[sweeper]', r))
      .catch((err) => console.warn('[sweeper] failed:', err.message));
  sweep();
  const timer = setInterval(sweep, 15 * 60 * 1000);
  timer.unref();

  const shutdown = async (signal) => {
    console.log(`[server] ${signal} received, shutting down`);
    clearInterval(timer);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('unhandledRejection', (reason) => console.error('[unhandledRejection]', reason));

main().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
