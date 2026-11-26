// Card types and the Philippine banks that issue them (checked Nov 26, 2026 against the banks'
// own pages and comparison sites; uncertain issuers left out). The sheets add "Other bank".
// No card number is ever asked for or stored.

export const NETWORKS = [
  { key: 'visa', label: 'Visa' },
  { key: 'mastercard', label: 'Mastercard' },
  { key: 'amex', label: 'American Express' },
  { key: 'jcb', label: 'JCB' },
  { key: 'unionpay', label: 'UnionPay' },
]

const BANKS = {
  visa: ['BDO', 'BPI', 'UnionBank', 'Metrobank', 'RCBC', 'HSBC', 'EastWest', 'Maybank', 'Maya'],
  mastercard: ['BDO', 'Metrobank', 'BPI', 'Security Bank', 'RCBC', 'UnionBank', 'Chinabank', 'AUB', 'PSBank', 'HSBC', 'EastWest', 'PNB', 'Maybank'],
  amex: ['BDO'],
  jcb: ['BDO', 'PNB', 'RCBC'],
  unionpay: ['BDO', 'RCBC', 'PNB'],
}
// Debit-only issuers, on top of the credit card lists.
const DEBIT_EXTRA = { visa: ['GoTyme'] }

export const PAY_LATER = ['Atome', 'SPayLater', 'TikTok Shop PayLater']

const labelOf = (key) => NETWORKS.find((n) => n.key === key)?.label

export const banksFor = (key) => [...(BANKS[key] ?? [])]
export const debitBanksFor = (key) => [...new Set([...banksFor(key), ...(DEBIT_EXTRA[key] ?? [])])]

/** A starting name for a new card: "BDO Visa"; a pay-later account is just its provider. */
export const cardName = (bank, key) => (labelOf(key) ? `${bank} ${labelOf(key)}` : bank)
export const debitName = (bank, key) => `${cardName(bank, key)} debit`

export function networkLabel(card) {
  if (card.type === 'pay_later') return 'Pay later'
  return labelOf(card.network) ?? 'Credit card'
}
