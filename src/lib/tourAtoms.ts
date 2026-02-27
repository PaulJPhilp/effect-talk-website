import { Atom } from "@effect-atom/atom"

/** All completed step IDs across all lessons. */
export const completedStepIdsAtom = Atom.make(new Set<string>()).pipe(Atom.keepAlive)

/** Whether initial progress data has been loaded from storage/API. */
export const progressLoadedAtom = Atom.make(false).pipe(Atom.keepAlive)
