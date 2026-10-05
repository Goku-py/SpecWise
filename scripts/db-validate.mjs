// DB validation: read-only contract checks for the SpecWise catalog.
// Run: npm run db:validate. Exit 0 = all checks pass, 1 = any failure.
// Stdlib + repo `pg` dep only. Never writes; never prints secrets.
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";

const EXPECTED_REGIONS = ["US", "IN", "GB", "DE", "CA", "AU"];
const IMAGE_HOSTS = ["images.unsplash.com"];

function isAllowedImageUrl(u) {
  if (u == null) return true; // null is valid by design (fallback renders)
  try {
    const p = new URL(u);
    if (p.protocol !== "https:") return false;
    if (!IMAGE_HOSTS.includes(p.hostname)) return false;
    return p.pathname.length > 1;
  } catch { return false; }
}

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  check("reachable", true, "PostgreSQL handshake ok");
} catch (e) {
  check("reachable", false, String(e?.message ?? e).slice(0, 200));
  console.log(`\n${results.filter(r => !r.ok).length} check(s) FAILED`);
  process.exit(1);
}

const q = (t, p) => client.query(t, p).then(r => r.rows);
try {
  // migrations: every on-disk migration applied?
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "prisma", "migrations");
  const onDisk = fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isDirectory()).sort();
  const applied = (await q("SELECT migration_name FROM _prisma_migrations")).map(r => r.migration_name);
  const missing = onDisk.filter(m => !applied.includes(m));
  check("migrations applied", missing.length === 0, `${applied.length} applied, ${onDisk.length} on disk${missing.length ? `; missing: ${missing.join(",")}` : ""}`);

  const [{ count: brands }] = await q('SELECT count(*) FROM "Brand"');
  const [{ count: retailers }] = await q('SELECT count(*) FROM "Retailer"');
  const [{ total, active }] = await q(`SELECT count(*) AS total, count(*) FILTER (WHERE status='active') AS active FROM "Laptop"`);
  const [{ count: prices }] = await q('SELECT count(*) FROM "LaptopPrice"');
  check("brand count", Number(brands) >= 10, `${brands} rows`);
  check("retailer count", Number(retailers) >= 6, `${retailers} rows`);
  check("laptop count", Number(total) === 56 && Number(active) === 56, `${active}/${total} active`);
  check("price count", Number(prices) === 56 * 12, `${prices} rows (expect 672 = 56 laptops x 12)`);

  const perRegion = await q('SELECT region, count(*) FROM "LaptopPrice" GROUP BY region ORDER BY region');
  const byRegion = Object.fromEntries(perRegion.map(r => [r.region, Number(r.count)]));
  const regionsOk = EXPECTED_REGIONS.every(r => byRegion[r] === 56 * 2);
  check("per-region distribution", regionsOk, EXPECTED_REGIONS.map(r => `${r}=${byRegion[r] ?? 0}`).join(" "));

  const dups = await q('SELECT slug, count(*) c FROM "Laptop" GROUP BY slug HAVING count(*) > 1');
  check("duplicate slugs", dups.length === 0, dups.length ? JSON.stringify(dups.slice(0, 5)) : "0 duplicates");
  const [{ count: nullSlugs }] = await q(`SELECT count(*) FROM "Laptop" WHERE slug IS NULL OR slug=''`);
  check("null slugs", Number(nullSlugs) === 0, `${nullSlugs} null/empty`);

  const missingFields = await q(`SELECT id, slug FROM "Laptop" WHERE brand IS NULL OR brand='' OR model IS NULL OR model='' OR os IS NULL OR os='' OR "cpuBrand" IS NULL OR "cpuFamily" IS NULL OR slug IS NULL OR slug='' OR "ramAmount" IS NULL OR "storageAmount" IS NULL OR "displaySize" IS NULL`);
  check("missing required fields", missingFields.length === 0, missingFields.length ? JSON.stringify(missingFields.slice(0, 5)) : "brand/model/os/cpuBrand/cpuFamily/ram/storage/display/slug all present");
  const [{ count: badNums }] = await q(`SELECT count(*) FROM "Laptop" WHERE "ramAmount" IS NULL OR "storageAmount" IS NULL OR "displaySize" IS NULL OR status <> 'active'`);
  check("invalid records (null numerics / non-active)", Number(badNums) === 0, `${badNums} bad`);

  const imgs = await q('SELECT slug, "imageUrl" FROM "Laptop" WHERE "imageUrl" IS NOT NULL');
  const badImgs = imgs.filter(r => !isAllowedImageUrl(r.imageUrl));
  check("image host allowlist", badImgs.length === 0, `${imgs.length} non-null, ${badImgs.length} off-allowlist${badImgs.length ? `: ${JSON.stringify(badImgs.slice(0, 3))}` : " (null = fallback, by design)"}`);

  const orphans = await q(`SELECT count(*) FROM "LaptopPrice" p LEFT JOIN "Laptop" l ON l.id = p."laptopId" WHERE l.id IS NULL`);
  check("orphaned prices", Number(orphans[0].count) === 0, `${orphans[0].count} orphaned`);
  const zeroPrice = await q(`SELECT l.slug FROM "Laptop" l LEFT JOIN "LaptopPrice" p ON p."laptopId"=l.id WHERE l.status='active' AND p."laptopId" IS NULL`);
  check("laptops with zero price rows", zeroPrice.length === 0, zeroPrice.length ? JSON.stringify(zeroPrice) : "every active laptop has prices");
} finally {
  await client.end();
}

const failed = results.filter(r => !r.ok);
console.log(`\n${failed.length === 0 ? "ALL CHECKS PASSED" : `${failed.length} check(s) FAILED`} (${results.length} total)`);
process.exit(failed.length ? 1 : 0);
