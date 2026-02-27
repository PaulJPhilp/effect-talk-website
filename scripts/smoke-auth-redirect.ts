#!/usr/bin/env bun

export {}

/**
 * Smoke test for sign-in redirect URI.
 *
 * Validates that /auth/sign-in generates a WorkOS authorize URL whose
 * redirect_uri host matches the expected host.
 *
 * Usage:
 *   bun run scripts/smoke-auth-redirect.ts https://effecttalk.dev effecttalk.dev
 *   bun run scripts/smoke-auth-redirect.ts https://staging-effecttalk.vercel.app staging-effecttalk.vercel.app
 */

function fail(message: string): never {
  console.error(`\nAuth redirect smoke test failed: ${message}\n`)
  process.exit(1)
}

async function main(): Promise<void> {
  const baseUrlArg = process.argv[2]
  const expectedHostArg = process.argv[3]

  if (!baseUrlArg || !expectedHostArg) {
    fail("Usage: bun run scripts/smoke-auth-redirect.ts <base-url> <expected-host>")
  }

  const baseUrl = baseUrlArg.replace(/\/$/, "")
  const signInUrl = `${baseUrl}/auth/sign-in`
  const response = await fetch(signInUrl)
  if (!response.ok) {
    fail(`GET ${signInUrl} returned ${response.status}`)
  }

  const html = await response.text()
  const authorizeMatch = html.match(/https:\/\/api\.workos\.com\/user_management\/authorize[^"']+/)
  if (!authorizeMatch) {
    fail("WorkOS authorize URL not found on sign-in page.")
  }

  const decodedAuthorizeUrl = authorizeMatch[0]
    .replaceAll("&amp;", "&")
  const redirectMatch = decodedAuthorizeUrl.match(/[?&]redirect_uri=([^&]+)/)
  if (!redirectMatch) {
    fail("redirect_uri query param not found in WorkOS authorize URL.")
  }

  const redirectUri = decodeURIComponent(redirectMatch[1])
  let redirectHost: string
  try {
    redirectHost = new URL(redirectUri).host
  } catch {
    fail(`redirect_uri is not a valid URL: ${redirectUri}`)
  }

  if (redirectHost !== expectedHostArg) {
    fail(`redirect host mismatch. expected=${expectedHostArg} actual=${redirectHost} redirect_uri=${redirectUri}`)
  }

  console.log("Auth redirect smoke test passed.")
  console.log(`- Base URL: ${baseUrl}`)
  console.log(`- Expected host: ${expectedHostArg}`)
  console.log(`- redirect_uri: ${redirectUri}`)
}

void main()
