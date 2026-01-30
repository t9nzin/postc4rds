import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Create Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ============================================
// BUDGET HARD STOP - Global spending limit
// ============================================

// Maximum budget in dollars - change this value to adjust your limit
const BUDGET_LIMIT_DOLLARS = 395; 

// Estimated cost per generation (Gemini Vision + Imagen 3 Fast)
// Adjust based on your actual usage - this is conservative
const COST_PER_GENERATION_DOLLARS = 0.20;

const BUDGET_KEY = "budget:total_spent_cents";

/**
 * Atomically reserve budget BEFORE making API calls.
 * Returns { allowed, newTotalCents } - if allowed is false, no reservation was made.
 */
export async function reserveBudget(): Promise<{
  allowed: boolean;
  newTotalCents: number;
  limitCents: number;
}> {
  const limitCents = Math.round(BUDGET_LIMIT_DOLLARS * 100);
  const costCents = Math.round(COST_PER_GENERATION_DOLLARS * 100);

  // Atomically increment and get the new value
  const newTotalCents = await redis.incrby(BUDGET_KEY, costCents);

  // If we exceeded the limit, roll back and deny
  if (newTotalCents > limitCents) {
    await redis.decrby(BUDGET_KEY, costCents);
    return { allowed: false, newTotalCents: newTotalCents - costCents, limitCents };
  }

  return { allowed: true, newTotalCents, limitCents };
}

/**
 * Release reserved budget if generation fails (optional - call on error)
 */
export async function releaseBudget(): Promise<void> {
  const costCents = Math.round(COST_PER_GENERATION_DOLLARS * 100);
  await redis.decrby(BUDGET_KEY, costCents);
}

// Rate limit: 3 generations per hour per IP
export const generationRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "1 h"),
  analytics: true,
  prefix: "ratelimit:generation",
});

// Helper to get client IP from request
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  return "unknown";
}
