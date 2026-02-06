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
export * from "./Db/api"
export * from "./Auth/api"
export * from "./ApiKeys/api"
export * from "./Analytics/api"
export * from "./Email/api"
export * from "./BackendApi/api"

// Export types for convenience
export * from "./Db/types"
export * from "./ApiKeys/types"
export * from "./Analytics/types"
export * from "./BackendApi/types"

// Export errors for convenience
export * from "./Db/errors"
export * from "./Auth/errors"
export * from "./ApiKeys/errors"
export * from "./Email/errors"
export * from "./BackendApi/errors"
