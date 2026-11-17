# Vroomly — server

REST API for the Vroomly car rental marketplace: Express 5, MongoDB (Mongoose), Socket.IO, Stripe and Cloudinary.

**Live API:** https://vroomly-api.onrender.com  ← replace with your deployed URL
**Client repo:** [radhshahmat91/vroomly-client](https://github.com/radhshahmat91/vroomly-client) — the Next.js app

## Highlights

* **JWT-protected** — every private route verifies the BetterAuth JWT against the web app's JWKS endpoint (EdDSA, cached), then loads the user from MongoDB so suspensions and role changes apply immediately.
* **Role-aware** — `renter`, `owner` (approved host) and `admin`, enforced by middleware.
* **Honest pricing** — one tested pricing module computes totals in whole cents, applies weekly/monthly discounts and the platform commission.
* **Race-aware bookings** — overlapping dates are checked on request and again on accept; accepting a request automatically declines overlapping pending ones.
* **Payments** — Stripe PaymentIntents with server-side confirmation, an idempotent finaliser shared by the browser callback and the signed webhook, and full refunds on cancellation.
* **Realtime** — Socket.IO rooms per user push notifications as they are created.
* **Validated** — Zod schemas on every body and query string; one error handler turns everything into clean JSON.

## Getting started

```bash
docker compose up -d     # optional: a local MongoDB (then MONGODB_URI=mongodb://127.0.0.1:27017/vroomly)
npm install
cp .env.example .env     # set MONGODB_URI, AUTH_URL, CLIENT_URL …
npm run seed             # demo users, cars, bookings, reviews, payments, complaints
npm run dev              # http://localhost:5000
npm test                 # 36 Jest unit tests
```

The web app ([vroomly-client](https://github.com/radhshahmat91/vroomly-client)) must be running at `AUTH_URL` so the API can fetch its public keys.

### Environment variables

| Variable | Purpose |
|---|---|
| `MONGODB_URI`, `MONGODB_DB` | Database — **the same one the Next.js app uses** |
| `DNS_SERVERS` | Optional. Public DNS (`8.8.8.8,1.1.1.1`) for Node. If your network refuses Atlas SRV lookups (`querySrv ECONNREFUSED`) the API already falls back to resolving the address over HTTPS on its own |
| `CLIENT_URL` | Allowed browser origin(s), comma separated, no trailing slash |
| `AUTH_URL` | Public URL of the Next.js app (BetterAuth). JWT issuer/audience and the JWKS location derive from it |
| `AUTH_JWKS_URL` | Optional override for the JWKS location |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe test keys. Webhook endpoint: `POST /api/payments/webhook` (`payment_intent.succeeded`) |
| `DEMO_PAYMENTS` | `true` lets you click through checkout **without** Stripe keys. Ignored in production |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Image uploads (hosts can also paste image links) |
| `PLATFORM_COMMISSION` | Share kept by Vroomly, default `0.10` |

### Scripts

| Command | |
|---|---|
| `npm run dev` / `npm start` | Run with watch / run once |
| `npm run seed` | Reset and seed demo data. Only `@vroomly.app` users are touched, but the cars, bookings, reviews, payments, notifications and complaints collections are emptied, so it refuses to run unless the database name contains `vroomly` (override with `--force`) |
| `npm run seed:destroy` | Remove demo data |
| `npm run check-db` | Diagnose the database connection step by step (DNS, TCP, login, demo accounts) |
| `npm run make-admin -- you@example.com` | Promote an existing account to admin |
| `npm test` | Jest unit tests for pricing, availability and JWT verification |

## API reference

All responses are JSON: `{ data, meta? }` on success, `{ message, errors? }` on failure. Dates are `YYYY-MM-DD`. 🔒 = needs `Authorization: Bearer <JWT>`.

**Public**
`GET /api/health` · `GET /api/stats` · `GET /api/cars` (search, filters, sort, pagination, geo radius, availability) · `GET /api/cars/featured` · `GET /api/cars/meta` · `GET /api/cars/:id` · `GET /api/cars/:id/availability` · `GET /api/reviews/featured` · `GET /api/reviews/car/:id`

**Any signed-in user** 🔒
`GET|PATCH /api/users/me` · `POST /api/users/me/avatar` · `POST /api/users/me/become-host`
`GET /api/bookings/mine` · `GET /api/bookings/summary` · `POST /api/bookings` · `GET /api/bookings/:id` · `PATCH /api/bookings/:id/cancel`
`POST /api/payments/intent` · `POST /api/payments/confirm`
`POST /api/reviews` · `GET /api/reviews/mine`
`GET /api/notifications` · `PATCH /api/notifications/read-all` · `PATCH /api/notifications/:id/read` · `DELETE /api/notifications/:id`
`POST /api/complaints` · `GET /api/complaints/mine`

**Approved hosts** 🔒
`POST /api/cars` · `PATCH|DELETE /api/cars/:id` · `POST /api/cars/:id/blocked-dates` · `DELETE /api/cars/:id/blocked-dates/:blockId` · `POST /api/uploads/images`
`PATCH /api/bookings/:id/accept|reject|complete` · `POST /api/reviews/:id/reply`
`GET /api/owner/cars|stats|bookings|earnings|transactions|reviews`

**Admins** 🔒
`GET /api/admin/analytics` · `GET /api/admin/users` · `PATCH /api/admin/users/:id/status` · `GET /api/admin/owners` · `PATCH /api/admin/owners/:id/decision` · `GET /api/admin/cars` · `PATCH /api/admin/cars/:id/moderate` · `GET /api/admin/bookings` · `GET /api/admin/payments` · `GET /api/admin/reports/revenue` (`?format=csv`) · `GET /api/admin/complaints` · `PATCH /api/admin/complaints/:id`

**Stripe** — `POST /api/payments/webhook` (raw body, signature verified)

**Socket.IO** — connect with `auth: { token: <JWT> }`; listen for `notification:new`.

## Booking lifecycle

`pending` → host accepts → `accepted` → renter pays → `confirmed` → host marks the trip complete (or the end date passes) → `completed` → renter reviews.
A host can decline (`rejected`); either side can cancel before the trip (`cancelled`, with a full refund if it was paid). Requests whose start date passes unanswered expire automatically.

## Project structure

```
server.js            entry: connects the DB, starts Socket.IO + HTTP, runs the booking sweeper
src/app.js           Express app: security headers, CORS, rate limit, Stripe raw-body webhook, routes
src/config/          env validation (Zod), db, cloudinary, stripe
src/models/          User (BetterAuth's collection), Car, Booking, Review, Payment, Notification, Complaint
src/controllers/     one file per resource
src/routes/          one file per resource
src/middleware/      auth (JWT), error handling, validation, upload, id checks
src/validators/      Zod schemas
src/utils/           pricing, availability, dates, jwt, notifications, booking sweeper, password hashing
src/sockets/         Socket.IO singleton
src/seed/            demo data + seed / make-admin scripts
src/tests/           Jest unit tests (pricing, availability, JWT)
```

## Deploy to Render

`render.yaml` is included. Create a Web Service from this repo, add the environment variables above and deploy. Set `CLIENT_URL` and `AUTH_URL` to your Vercel URL. On the free plan the service sleeps when idle, so the first request after a pause can take up to a minute — the client shows spinners while it wakes.

The full go-live walkthrough (Atlas → Render → Vercel) is in the client repo: [`docs/DEPLOYMENT.md`](https://github.com/radhshahmat91/vroomly-client/blob/main/docs/DEPLOYMENT.md).
