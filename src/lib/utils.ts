import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number, currency: string): string {
  const map: Record<string, { locale: string; currency: string }> = {
    USD: { locale: "en-US", currency: "USD" },
    INR: { locale: "en-IN", currency: "INR" },
    GBP: { locale: "en-GB", currency: "GBP" },
    EUR: { locale: "de-DE", currency: "EUR" },
    CAD: { locale: "en-CA", currency: "CAD" },
    AUD: { locale: "en-AU", currency: "AUD" },
  }
  const config = map[currency] || map.USD
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.currency,
    maximumFractionDigits: 0,
  }).format(price)
}

export const CURRENCIES = [
  { code: "USD", symbol: "$", label: "US Dollar", countries: ["US"] },
  { code: "INR", symbol: "₹", label: "Indian Rupee", countries: ["IN"] },
  { code: "GBP", symbol: "£", label: "British Pound", countries: ["GB"] },
  { code: "EUR", symbol: "€", label: "Euro", countries: ["DE", "FR", "IT", "ES", "NL"] },
  { code: "CAD", symbol: "C$", label: "Canadian Dollar", countries: ["CA"] },
  { code: "AUD", symbol: "A$", label: "Australian Dollar", countries: ["AU"] },
] as const


