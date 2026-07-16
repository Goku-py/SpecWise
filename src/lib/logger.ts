import { NextResponse } from "next/server"

export function withLogging(
  handler: (req: Request, rid: string, ...args: any[]) => Promise<Response>
): (req: Request, ...args: any[]) => Promise<Response> {
  return async (req, ...args) => {
    const rid = crypto.randomUUID()
    const start = performance.now()
    try {
      const res = await handler(req, rid, ...args)
      const ms = Math.round(performance.now() - start)
      console.log(JSON.stringify({
        level: "info",
        rid,
        method: req.method,
        path: new URL(req.url).pathname,
        ms,
        status: res.status,
      }))
      res.headers.set("x-request-id", rid)
      return res
    } catch (err) {
      const ms = Math.round(performance.now() - start)
      console.error(JSON.stringify({
        level: "error",
        rid,
        method: req.method,
        path: new URL(req.url).pathname,
        ms,
        error: String(err),
      }))
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: { "x-request-id": rid } }
      )
    }
  }
}
