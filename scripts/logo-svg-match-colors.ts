#!/usr/bin/env bun
/**
 * Replace traced logo.svg colors with brand colors (orange ring, dark teal bar, white).
 * Run after png-to-svg.ts. Usage: bun run scripts/logo-svg-match-colors.ts
 */

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..")
const svgPath = join(rootDir, "public", "logo.svg")

// Brand colors from logo description: orange ring, dark teal bar, white text
const ORANGE = "rgb(196,92,38)"   // burnt orange / terracotta ring
const TEAL   = "rgb(45,74,74)"    // dark teal-grey bar
const WHITE  = "rgb(255,255,255)"

let svg = readFileSync(svgPath, "utf8")

// Traced colors → brand colors
// Orange/brown (ring) from tracer
svg = svg.replace(/rgb\(140,94,56\)/g, ORANGE)
// Slightly grey (bar) from tracer
svg = svg.replace(/rgb\(240,239,235\)/g, TEAL)
// Near-whites (background + text) → clean white (exact values from tracer output)
const nearWhites = [
  "251,252,252", "251,252,253", "252,250,252", "252,251,251", "252,253,252",
  "253,252,253", "253,253,253", "253,254,253", "253,254,254", "253,255,253", "254,251,253",
]
for (const rgb of nearWhites) {
  svg = svg.split(`rgb(${rgb})`).join(WHITE)
}

writeFileSync(svgPath, svg, "utf8")
console.log("Updated logo.svg with brand colors")
