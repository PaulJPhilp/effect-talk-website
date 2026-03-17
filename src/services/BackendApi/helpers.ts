/**
 * Backend API service helpers.
 */

import { BackendApiError } from "@/services/BackendApi/errors";
import {
  CACHE_REVALIDATE_SECONDS,
  CONTENT_TYPE_JSON,
  DEFAULT_BACKEND_API_BASE_URL,
} from "@/types/constants";

export function getBaseUrl(): string {
  return process.env.BACKEND_API_BASE_URL ?? DEFAULT_BACKEND_API_BASE_URL;
}

export async function apiFetch<T>(path: string): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": CONTENT_TYPE_JSON },
    // Allow Next.js to cache; ISR revalidation will refetch
    next: { revalidate: CACHE_REVALIDATE_SECONDS },
  });
  if (!res.ok) {
    throw new BackendApiError({
      message: `Backend API error: ${res.status} ${res.statusText}`,
      status: res.status,
    });
  }
  return res.json() as Promise<T>;
}
