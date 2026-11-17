import Stripe from 'stripe';
import { env } from './env.js';

export const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;

/** Demo payments are an explicit opt-in for local demos when no Stripe keys exist. */
export const demoPaymentsEnabled = !stripe && env.DEMO_PAYMENTS && !env.isProd;
