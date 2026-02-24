import { notFound } from "next/navigation"
import { TestSandpackClient } from "@/app/test-sandpack/TestSandpackClient"

/** Only available when APP_ENV=local (or NODE_ENV=development). Returns 404 in production/staging. */
export default function TestSandpackPage() {
  const appEnv = process.env.APP_ENV
  const isDev = process.env.NODE_ENV === "development"
  if (appEnv === "production" || appEnv === "staging") {
    notFound()
  }
  if (!isDev && appEnv !== "local") {
    notFound()
  }
  return <TestSandpackClient />
}
