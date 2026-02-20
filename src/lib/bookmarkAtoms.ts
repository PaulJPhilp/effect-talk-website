import { Atom } from "@effect-atom/atom"

/** All bookmarked pattern IDs. */
export const bookmarkedPatternIdsAtom = Atom.make(new Set<string>()).pipe(Atom.keepAlive)

/** Whether initial bookmark data has been loaded from storage/API. */
export const bookmarksLoadedAtom = Atom.make(false).pipe(Atom.keepAlive)
