import { Resend } from "resend"
import { formatPrice } from "@/lib/utils"
import type { RecommendedLaptop } from "@/lib/types"

// ponytail: no key configured (e.g. local dev) -> skip send, don't crash
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function isValidHttpUrl(url: string | null): boolean {
  if (!url) return false
  try {
    const u = new URL(url)
    return u.protocol === "http:" || u.protocol === "https:"
  } catch {
    return false
  }
}

function buildHtml(results: RecommendedLaptop[]): string {
  const rows = results
    .map((r, i) => {
      const name = `${escapeHtml(r.brand)} ${escapeHtml(r.model)}${r.variant ? ` (${escapeHtml(r.variant)})` : ""}`
      const price = escapeHtml(formatPrice(r.price, r.currency))
      const reason = escapeHtml(r.matchReasons[0] ?? "")
      const link = isValidHttpUrl(r.affiliateUrl)
        ? `<a href="${escapeHtml(r.affiliateUrl!)}">View deal</a>`
        : ""
      return `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${name}</strong></td>
        <td>${price}</td>
        <td>${reason}</td>
        <td>${link}</td>
      </tr>`
    })
    .join("")
  return `<h2>Your laptop matches</h2>
    <table cellpadding="6" cellspacing="0" border="1" style="border-collapse:collapse">
      <tr><th>#</th><th>Laptop</th><th>Price</th><th>Why</th><th></th></tr>
      ${rows}
    </table>`
}

export async function sendResultsEmail(email: string, results: RecommendedLaptop[]): Promise<void> {
  if (!resend || results.length === 0) return

  const TIMEOUT_MS = 10_000
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      resend.emails.send({
        from: "Specwise <noreply@specwise.app>", // ponytail: replace with your verified sender
        to: [email],
        subject: "Your top laptop matches from Specwise",
        html: buildHtml(results),
      }),
      new Promise<void>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Resend timeout")), TIMEOUT_MS)
      }),
    ])
  } catch (err) {
    if (err instanceof Error && err.message === "Resend timeout") {
      console.warn("[email] Resend API timed out after 10s, skipping send")
      return
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}
