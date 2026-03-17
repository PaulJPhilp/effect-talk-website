/**
 * Database service types.
 */

import type { WaitlistSource } from "@/types/strings";

export interface WaitlistSignup {
  readonly created_at: string;
  readonly email: string;
  readonly id: string;
  readonly role_or_company: string | null;
  readonly source: WaitlistSource;
}

export interface ConsultingInquiry {
  readonly company: string | null;
  readonly created_at: string;
  readonly description: string;
  readonly email: string;
  readonly id: string;
  readonly name: string;
  readonly role: string | null;
}

export interface Feedback {
  readonly created_at: string;
  readonly email: string;
  readonly id: string;
  readonly message: string;
  readonly name: string | null;
}

export interface DbUser {
  readonly avatar_url: string | null;
  readonly created_at: string;
  readonly email: string;
  readonly id: string;
  readonly name: string | null;
  readonly preferences: Record<string, unknown>;
  readonly updated_at: string;
  readonly workos_id: string;
}

export interface DbPattern {
  readonly category: string | null;
  readonly content: string;
  readonly created_at: string;
  readonly description: string;
  readonly difficulty: string | null;
  readonly id: string;
  readonly new: boolean;
  readonly tags: readonly string[] | null;
  readonly title: string;
  readonly updated_at: string;
}

export interface DbRule {
  readonly category: string | null;
  readonly content: string;
  readonly created_at: string;
  readonly description: string;
  readonly id: string;
  readonly severity: string | null;
  readonly tags: readonly string[] | null;
  readonly title: string;
  readonly updated_at: string;
}

export interface DbApiKey {
  readonly created_at: string;
  readonly id: string;
  readonly key_hash: string;
  readonly key_prefix: string;
  readonly name: string;
  readonly revoked_at: string | null;
  readonly user_id: string;
}
