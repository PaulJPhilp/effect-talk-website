/**
 * Unit tests for Db service helpers.
 */

import { describe, it, expect } from "vitest"
import { toDbError } from "../helpers"
import { DbError } from "../errors"

describe("Db helpers", () => {
  describe("toDbError", () => {
    it("should convert Error to DbError", () => {
      const error = new Error("Database connection failed")
      const dbError = toDbError(error)

      expect(dbError).toBeInstanceOf(DbError)
      expect(dbError._tag).toBe("DbError")
      expect(dbError.message).toBe("Database connection failed")
      expect(dbError.cause).toBe(error)
    })

    it("should handle non-Error values", () => {
      const dbError = toDbError("string error")

      expect(dbError).toBeInstanceOf(DbError)
      expect(dbError._tag).toBe("DbError")
      expect(dbError.message).toBe("Database query failed")
      expect(dbError.cause).toBe("string error")
    })

    it("should handle null/undefined", () => {
      const dbError1 = toDbError(null)
      const dbError2 = toDbError(undefined)

      expect(dbError1.message).toBe("Database query failed")
      expect(dbError2.message).toBe("Database query failed")
    })
  })
})
