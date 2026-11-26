// The soft "sign in to back it up" nudge for guests (milestone 8). Signing in is never required.

/** True when a guest should see the one-time backup toast after adding something. */
export const shouldNudge = ({ signedIn, available, nudged }) => available && !signedIn && !nudged
