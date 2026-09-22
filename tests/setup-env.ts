/**
 * Loads .env before any test module evaluates. The app reads ADMIN_API_KEY /
 * DATABASE_URL from process.env at module load (src/lib/prisma.ts builds its
 * pg pool eagerly on import), so dotenv must run FIRST — vitest does not load
 * dotenv by itself. Registered via setupFiles in vitest.config.mts; harmless
 * for the scoring suite (it never touches process.env-dependent modules).
 * Also opts out of catalog cache revalidation for test processes (see below).
 */
import "dotenv/config"
// Write paths call revalidateTag/revalidatePath which throw outside the
// Next.js runtime; the writes are committed and revalidation is exercised
// over HTTP by the route-handler tests instead.
process.env.SKIP_CACHE_REVALIDATE = "1"