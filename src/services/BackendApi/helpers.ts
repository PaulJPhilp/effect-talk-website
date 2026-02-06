/**
 * Backend API service helpers.
 */

import {
  DEFAULT_BACKEND_API_BASE_URL,
  CONTENT_TYPE_JSON,
  CACHE_REVALIDATE_SECONDS,
} from "@/types/constants"
import { BackendApiError } from "./errors"

export function getBaseUrl(): string {
  return process.env.BACKEND_API_BASE_URL ?? DEFAULT_BACKEND_API_BASE_URL
}

export async function apiFetch<T>(path: string): Promise<T> {
  const url = `${getBaseUrl()}${path}`
  const res = await fetch(url, {
    headers: { "Content-Type": CONTENT_TYPE_JSON },
    // Allow Next.js to cache; ISR revalidation will refetch
    next: { revalidate: CACHE_REVALIDATE_SECONDS },
  })
  if (!res.ok) {
    throw new BackendApiError({ message: `Backend API error: ${res.status} ${res.statusText}`, status: res.status })
  }
  return res.json() as Promise<T>
}
