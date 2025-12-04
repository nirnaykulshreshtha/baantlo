/**
 * @file api.ts
 * @description API client for fetching supported currencies from the backend.
 * This is a public endpoint that doesn't require authentication.
 */

"use server"

import { z } from "zod"
import { env } from "@/lib/env"

/**
 * Currency information schema matching backend response.
 */
const CurrencySchema = z.object({
  code: z.string().length(3),
  name: z.string(),
  symbol: z.string(),
})

const CurrenciesResponseSchema = z.array(CurrencySchema)

export type Currency = z.infer<typeof CurrencySchema>

/**
 * Fetches all supported currencies from the backend.
 * This is a public endpoint that doesn't require authentication.
 * 
 * @returns Array of supported currencies with code, name, and symbol
 * @throws Error if the API request fails
 */
export async function getSupportedCurrencies(): Promise<Currency[]> {
  const baseUrl = env.BACKEND_API_URL.replace(/\/+$/, "")
  const url = `${baseUrl}/api/v1/currencies`

  console.log("[Currencies API] Fetching currencies from:", url)

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      // Cache for 1 hour since currencies don't change frequently
      next: {
        revalidate: 3600,
      },
    })

    if (!response.ok) {
      throw new Error(
        `Failed to fetch currencies: ${response.status} ${response.statusText}`
      )
    }

    const data = await response.json()
    const validated = CurrenciesResponseSchema.parse(data)

    console.log(`[Currencies API] Fetched ${validated.length} currencies`)

    return validated
  } catch (error) {
    console.error("[Currencies API] Error fetching currencies:", error)
    throw error
  }
}

