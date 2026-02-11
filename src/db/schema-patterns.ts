/**
 * effect_patterns table — READ ONLY.
 * Owned by Effect Pattern repo. Do not push or migrate from this repo.
 * See docs/database.md.
 */

import { pgTable, uuid, text, jsonb, timestamp, index, integer, varchar, boolean } from "drizzle-orm/pg-core"

/** Release at or above this version are shown as "New" in the UI. */
export const NEW_PATTERN_RELEASE_CUTOFF = "0.12.0"

/** effect_patterns table (shared DB). Exported as patterns so app code is unchanged. */
export const patterns = pgTable("effect_patterns", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 255 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  summary: text("summary").notNull(),
  skillLevel: varchar("skill_level", { length: 50 }).notNull(),
  category: varchar("category", { length: 100 }),
  difficulty: varchar("difficulty", { length: 50 }),
  tags: jsonb("tags").$type<unknown>().default([]),
  examples: jsonb("examples").$type<unknown>().default([]),
  useCases: jsonb("use_cases").$type<unknown>().default([]),
  rule: jsonb("rule").$type<unknown>(),
  content: text("content"),
  author: varchar("author", { length: 255 }),
  lessonOrder: integer("lesson_order"),
  applicationPatternId: uuid("application_pattern_id"),
  validated: boolean("validated").notNull().default(false),
  validatedAt: timestamp("validated_at", { withTimezone: false }),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: false }).notNull().defaultNow(),
  releaseVersion: varchar("release_version", { length: 20 }),
}, (table) => [
  index("idx_patterns_category").on(table.category),
  index("idx_patterns_difficulty").on(table.difficulty),
])
