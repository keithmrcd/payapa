// What Android's Back (gesture from either edge, or the button) does in Payapa.

export const EXIT_WINDOW_MS = 2000 // a second Back on Home within this closes the app

/** 'close-sheet' | 'go-back' | 'go-home' | 'warn-exit' | 'exit' */
export function backAction({ sheetOpen, atHome, canGoBack, now, lastBackAt }) {
  if (sheetOpen) return 'close-sheet'
  if (!atHome) return canGoBack ? 'go-back' : 'go-home'
  return lastBackAt != null && now - lastBackAt < EXIT_WINDOW_MS ? 'exit' : 'warn-exit'
}
