/**
 * Numeric semver comparison for simple "major.minor.patch" strings.
 * Returns negative if a < b, 0 if equal, positive if a > b.
 */
export function semverCompare(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}

/** True when `version` is >= `cutoff` using numeric semver ordering. */
export function semverGte(version: string, cutoff: string): boolean {
  return semverCompare(version, cutoff) >= 0;
}
