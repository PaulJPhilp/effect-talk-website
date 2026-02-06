/**
 * API Keys service types.
 */

import type { DbApiKey } from "../Db/types"

export interface CreatedApiKey {
  /** The full plaintext token — shown ONCE to the user */
  readonly plaintext: string
  /** The DB record (without plaintext) */
  readonly record: DbApiKey
}
