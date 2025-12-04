/**
 * @file errors.ts
 * @description Helpers for extracting meaningful error messages from backend responses.
 */

/**
 * Attempts to extract a human-readable error message from a backend payload.
 *
 * @param payload - The decoded JSON payload from the backend.
 * @param fallback - Fallback message to use when no message can be resolved.
 */
export function extractErrorMessage(payload: unknown, fallback = "Unexpected backend error"): string {
  if (!payload || typeof payload !== "object") {
    return fallback
  }

  const data = payload as Record<string, unknown>
  const candidateKeys = ["message", "error", "detail", "error_code", "code"]

  for (const key of candidateKeys) {
    const value = data[key]
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim()
    }
  }

  const detail = data["detail"]
  if (detail && typeof detail === "object") {
    const detailRecord = detail as Record<string, unknown>
    for (const key of candidateKeys) {
      const value = detailRecord[key]
      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim()
      }
    }
  }

  return fallback
}
