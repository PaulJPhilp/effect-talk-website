/**
 * Backend API service types.
 */

export interface Pattern {
  readonly category?: string;
  readonly content: string;
  readonly description: string;
  readonly difficulty?: string;
  readonly id: string;
  readonly new?: boolean;
  readonly tags?: readonly string[];
  readonly title: string;
}

export interface Rule {
  readonly category?: string;
  readonly content: string;
  readonly description: string;
  readonly id: string;
  readonly severity?: string;
  readonly tags?: readonly string[];
  readonly title: string;
}

export interface SearchResult {
  readonly patterns: readonly Pattern[];
  readonly rules: readonly Rule[];
}
