/**
 * Service barrel exports and layer composition helpers.
 *
 * For v1, services are standalone functions (not Layer-based) since
 * Next.js route handlers are request-scoped and short-lived.
 * Each service function manages its own dependencies internally.
 *
 * If the app grows, migrate to full Effect Layer composition.
 */

// Export all APIs
export * from "@/services/Db/api"
export * from "@/services/Auth/api"
export * from "@/services/ApiKeys/api"
export * from "@/services/Analytics/api"
export * from "@/services/Email/api"
export * from "@/services/BackendApi/api"

// Export types for convenience
export * from "@/services/Db/types"
export * from "@/services/ApiKeys/types"
export * from "@/services/Analytics/types"
export * from "@/services/BackendApi/types"

// Export errors for convenience
export * from "@/services/Db/errors"
export * from "@/services/Auth/errors"
export * from "@/services/ApiKeys/errors"
export * from "@/services/Email/errors"
export * from "@/services/BackendApi/errors"
