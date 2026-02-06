/**
 * Test setup file for Vitest.
 */

import { expect } from "vitest"
import "@testing-library/jest-dom"

// No mocks — no cleanup needed

// Mock environment variables
process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://test:test@localhost:5432/test"
process.env.WORKOS_API_KEY = process.env.WORKOS_API_KEY ?? "sk_test_mock"
process.env.WORKOS_CLIENT_ID = process.env.WORKOS_CLIENT_ID ?? "client_mock"
process.env.WORKOS_REDIRECT_URI = process.env.WORKOS_REDIRECT_URI ?? "http://localhost:3000/auth/callback"
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY ?? "re_mock"
process.env.API_KEY_PEPPER = process.env.API_KEY_PEPPER ?? "test-pepper"
process.env.BACKEND_API_BASE_URL = process.env.BACKEND_API_BASE_URL ?? "http://localhost:4000"
process.env.APP_ENV = "test"
