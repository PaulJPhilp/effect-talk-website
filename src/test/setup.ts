/**
 * Test setup file for Vitest.
 */

import "@testing-library/jest-dom"

// No mocks — no cleanup needed

// Mock environment variables. When RUN_INTEGRATION_TESTS=1, preserve DATABASE_URL and
// APP_ENV from .env.local so integration tests can run against production.
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === "1"

process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://test:test@localhost:5432/test"
process.env.WORKOS_API_KEY = process.env.WORKOS_API_KEY ?? "sk_test_mock"
process.env.WORKOS_CLIENT_ID = process.env.WORKOS_CLIENT_ID ?? "client_mock"
process.env.WORKOS_REDIRECT_URI = process.env.WORKOS_REDIRECT_URI ?? "http://localhost:3000/auth/callback"
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY ?? "re_mock"
process.env.API_KEY_PEPPER = process.env.API_KEY_PEPPER ?? "test-pepper"
process.env.BACKEND_API_BASE_URL = process.env.BACKEND_API_BASE_URL ?? "http://localhost:4000"
process.env.APP_ENV = runIntegrationTests ? (process.env.APP_ENV ?? "production") : "test"
