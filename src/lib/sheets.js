// Every open BottomSheet registers its close, so Android's Back can close the one on top.

const stack = []

/** Register an open sheet's close function. Returns the function that unregisters it. */
export function registerSheet(close) {
  const entry = { close }
  stack.push(entry)
  return () => { const i = stack.indexOf(entry); if (i !== -1) stack.splice(i, 1) }
}

export const anySheetOpen = () => stack.length > 0

/** Close the most recently opened sheet. False when none is open. */
export function closeTopSheet() {
  const top = stack.at(-1)
  if (!top) return false
  top.close()
  return true
}
