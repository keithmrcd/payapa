// Watches the store's row arrays for any add, replace or removal. The store writes rows with push/splice on
// the same arrays, so the watch must reach inside them: depth 1 is the outer [items, ...] list this getter
// builds, depth 2 is each array's entries.

import { watch } from 'vue'

export const watchRows = (store, cb) =>
  watch(() => [store.items, store.cards, store.cardStatements, store.payments], cb, { deep: 2 })
