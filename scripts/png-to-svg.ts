#!/usr/bin/env bun
/**
 * Convert public/logo.png to public/logo.svg using pure-JS tracer.
 * Usage: bun run scripts/png-to-svg.ts
 */

import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
// @ts-expect-error no types
import { PNG } from "pngjs"
// @ts-expect-error no types
import ImageTracer from "imagetracerjs"

const rootDir = join(import.meta.dir, "..")
const inputPath = join(rootDir, "public", "logo.png")
const outputPath = join(rootDir, "public", "logo.svg")

const buffer = readFileSync(inputPath)
const png = PNG.sync.read(buffer)
const imagedata = {
  width: png.width,
  height: png.height,
  data: new Uint8ClampedArray(png.data),
}
const svg = ImageTracer.imagedataToSVG(imagedata, {
  numberofcolors: 16,
  scale: 1,
})
writeFileSync(outputPath, svg, "utf8")
console.log(`Wrote ${outputPath}`)
