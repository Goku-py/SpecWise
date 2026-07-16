"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { REGION_CODES, getRegion, type RegionConfig } from "@/lib/regions"

interface RegionContextValue {
  region: RegionConfig
  setRegion: (code: string) => void
}

const RegionContext = createContext<RegionContextValue | null>(null)

const STORAGE_KEY = "specwise-region"
const DEFAULT_REGION = "US"
const IPAPI_TIMEOUT_MS = 3000

export function RegionProvider({ children }: { children: React.ReactNode }) {
  // Default to US during SSR/hydration to avoid mismatch; effect corrects after mount.
  const [code, setCode] = useState(DEFAULT_REGION)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      setCode(stored)
      return
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), IPAPI_TIMEOUT_MS)

    fetch("https://ipapi.co/json/", { signal: controller.signal })
      .then(r => r.json())
      .then(d => {
        clearTimeout(timeout)
        const detected = d?.country_code && REGION_CODES.includes(d.country_code)
          ? d.country_code
          : DEFAULT_REGION
        setCode(detected)
        localStorage.setItem(STORAGE_KEY, detected)
      })
      .catch(() => {
        clearTimeout(timeout)
        setCode(DEFAULT_REGION)
        localStorage.setItem(STORAGE_KEY, DEFAULT_REGION)
      })
  }, [])

  const setRegion = useCallback((c: string) => {
    setCode(c)
    localStorage.setItem(STORAGE_KEY, c)
  }, [])

  return (
    <RegionContext.Provider value={{ region: getRegion(code), setRegion }}>
      {children}
    </RegionContext.Provider>
  )
}

export function useRegion(): RegionContextValue {
  const ctx = useContext(RegionContext)
  if (!ctx) throw new Error("useRegion must be used within RegionProvider")
  return ctx
}
