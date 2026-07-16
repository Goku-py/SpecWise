import { PrismaClient } from "../generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function getPoolConfig(): pg.PoolConfig {
  return {
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.POSTGRES_POOL_MAX ?? 15),
    idleTimeoutMillis: Number(process.env.POSTGRES_POOL_IDLE_TIMEOUT_MS ?? 120000),
    connectionTimeoutMillis: Number(process.env.POSTGRES_POOL_CONNECTION_TIMEOUT_MS ?? 15000),
  }
}

function createPrismaClient() {
  const pool = new pg.Pool(getPoolConfig())
  pool.on("error", err => {
    console.error("Postgres pool error:", err)
  })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
