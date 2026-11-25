// SYNTHETIC DEMO DATA, for designing the screens until Dexie + Supabase land
// (milestone 2). Amounts are invented; replace with your own entries.
// Dates are built relative to the current month so the screens always have
// something overdue, something due this week, and something paid.

import { iso } from '@/lib/dates'
export { iso }

export function buildDemo(today = new Date()) {
  const Y = today.getFullYear()
  const M = today.getMonth()
  const day = (d, mo = 0) => iso(Y, M + mo, d)

  const accounts = [
    { id: 'bdo', name: 'BDO Savings', short: 'BDO', type: 'bank' },
    { id: 'gotyme', name: 'GoTyme', short: 'GoTyme', type: 'bank' },
    { id: 'maribank', name: 'MariBank', short: 'MariBank', type: 'bank' },
    { id: 'gcash', name: 'GCash', short: 'GCash', type: 'ewallet' },
    { id: 'maya', name: 'Maya', short: 'Maya', type: 'ewallet' },
    { id: 'cash', name: 'Cash', short: 'Cash', type: 'cash' },
  ]

  // Bills, subscriptions, loans. amount in centavos. dueDay = monthly due day.
  const items = [
    { id: 'meralco', name: 'Meralco', kind: 'bill', category: 'electricity', amount: 341250, variable: true, dueDay: 20, account: 'gcash', note: 'Account 0412-xxx' },
    { id: 'maynilad', name: 'Maynilad', kind: 'bill', category: 'water', amount: 48500, variable: true, dueDay: 18, account: 'gcash' },
    { id: 'converge', name: 'Converge Fiber', kind: 'bill', category: 'internet', amount: 169900, dueDay: 28, account: 'bdo' },
    { id: 'globe', name: 'Globe Postpaid', kind: 'bill', category: 'phone', amount: 99900, dueDay: 26, account: 'gcash' },
    { id: 'sss', name: 'SSS Salary Loan', kind: 'loan', category: 'loan', amount: 152300, dueDay: 10, account: 'bdo', progress: { paid: 9, total: 24 } },
    { id: 'netflix', name: 'Netflix', kind: 'subscription', category: 'video', amount: 54900, dueDay: 3, account: 'maya' },
    { id: 'spotify', name: 'Spotify Duo', kind: 'subscription', category: 'music', amount: 19400, dueDay: 12, account: 'maya' },
    { id: 'icloud', name: 'iCloud+ 200 GB', kind: 'subscription', category: 'cloud', amount: 14900, dueDay: 27, account: 'gotyme' },
  ]

  // Credit cards and pay-later accounts, with this cycle's statement.
  const cards = [
    {
      id: 'bdo-visa', name: 'BDO Gold Visa', provider: 'BDO', type: 'credit_card', last4: '4821',
      limit: 12000000, statementDay: 5, dueDay: 27, account: 'bdo', tone: 'navy',
      statement: { date: day(5), due: day(27), balance: 1248000, minimum: 62400 },
      installments: [{ id: 'i1', name: 'Lenovo IdeaPad, 0% for 12 months', monthly: 316600, paid: 4, total: 12 }],
    },
    {
      id: 'bdo-mc', name: 'BDO Gold Mastercard', provider: 'BDO', type: 'credit_card', last4: '7730',
      limit: 8000000, statementDay: 20, dueDay: 12, account: 'bdo', tone: 'graphite',
      statement: { date: day(20), due: day(12, 1), balance: 853060, minimum: 50000 },
      installments: [],
    },
    {
      id: 'atome', name: 'Atome', provider: 'Atome', type: 'pay_later', last4: null,
      limit: 2500000, statementDay: 25, dueDay: 30, account: 'gotyme', tone: 'lime',
      statement: { date: day(25), due: day(30), balance: 208000, minimum: 208000 },
      installments: [
        { id: 'a1', name: 'Galaxy Buds3, 6 months', monthly: 125000, paid: 3, total: 6 },
        { id: 'a2', name: 'Uniqlo jacket, 3 months', monthly: 83000, paid: 2, total: 3 },
      ],
    },
    {
      id: 'spaylater', name: 'SPayLater', provider: 'Shopee', type: 'pay_later', last4: null,
      limit: 3000000, statementDay: 25, dueDay: 5, account: 'maribank', tone: 'orange',
      statement: { date: day(25), due: day(5, 1), balance: 108325, minimum: 108325 },
      installments: [{ id: 's1', name: 'Xiaomi robot vacuum, 12 months', monthly: 108325, paid: 7, total: 12 }],
    },
    {
      id: 'tiktok', name: 'TikTok Shop PayLater', provider: 'TikTok', type: 'pay_later', last4: null,
      limit: 1000000, statementDay: 1, dueDay: 15, account: 'gcash', tone: 'ink',
      statement: { date: day(1), due: day(15), balance: 64000, minimum: 64000 },
      installments: [],
    },
  ]

  // Payments already made. `ref` ties a payment to an item or a card statement.
  const payments = [
    { id: 'p1', ref: 'item:netflix:' + day(3), amount: 54900, paidOn: day(3), account: 'maya' },
    { id: 'p2', ref: 'item:sss:' + day(10), amount: 152300, paidOn: day(9), account: 'bdo', referenceNo: 'SSS-88213' },
    { id: 'p3', ref: 'item:spotify:' + day(12), amount: 19400, paidOn: day(12), account: 'maya' },
    { id: 'p4', ref: 'card:tiktok:' + day(15), amount: 64000, paidOn: day(14), account: 'gcash' },
    { id: 'p5', ref: 'item:maynilad:' + day(18), amount: 46275, paidOn: day(17), account: 'gcash', referenceNo: '7731 0094' },
    { id: 'p6', ref: 'card:bdo-visa:' + day(27), amount: 300000, paidOn: day(15), account: 'bdo', note: 'Partial after payday' },
    // last month, for History
    { id: 'p7', ref: 'item:meralco:' + day(20, -1), amount: 298870, paidOn: day(19, -1), account: 'gcash' },
    { id: 'p8', ref: 'item:converge:' + day(28, -1), amount: 169900, paidOn: day(27, -1), account: 'bdo' },
    { id: 'p9', ref: 'card:bdo-visa:' + day(27, -1), amount: 1102450, paidOn: day(25, -1), account: 'bdo' },
    { id: 'p10', ref: 'item:globe:' + day(26, -1), amount: 99900, paidOn: day(24, -1), account: 'gcash' },
  ]

  return { accounts, items, cards, payments }
}
