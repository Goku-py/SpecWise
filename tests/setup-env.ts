/**
 * Loads .env before any test module evaluates. The app reads ADMIN_API_KEY /
 * DATABASE_URL from process.env at module load (src/lib/prisma.ts builds its
 * pg pool eagerly on import), so dotenv must run FIRST — vitest does not load
 * dotenv by itself. Registered via setupFiles in vitest.config.mts; harmless
 * for the scoring suite (it never touches process.env-dependent modules).
 */
import "dotenv/config"