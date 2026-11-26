# Add a card: credit or debit after the bank

Small change, approved in chat on Nov 26, 2026.

## Why

Adding a card shouldn't assume it's a credit card. The owner picks the card type, then the bank, and only then says whether it's credit or debit, the way they'd look at the card in their hand.

## Flow

1. **Add a card** (Cards tab, or "Card" in the + sheet): Visa, Mastercard, American Express, JCB, UnionPay, and Pay later. Card types have no "Credit card" hint.
2. **Which bank's Visa?** Every bank that issues that type, credit or debit (GoTyme now shows under Visa), plus "Other bank".
3. **Credit or debit?** Two rows. Skipped when the bank issues only one kind (GoTyme → debit). "Other bank" always asks.
   - Credit card → today's credit card form; the card shows on the Cards tab.
   - Debit card → a short form (Name, Short name) that saves a payment account (`type: 'debit'`, `network`, `bank`). It shows in Accounts and "Paid from", never on the Cards tab.

Pay later is unchanged. Settings → Accounts → Debit card keeps working.

## Approaches

- **Chosen:** add a "credit or debit" step to the existing list picker in `AddSheet`, and save debit cards through `money.addAccount`. Reuses the picker and keeps one entry point.
- Not chosen: open `AccountSheet` for debit. That's a second sheet stacked on the add sheet, and its form asks for type and bank again.

## Calls made while building

- In the + sheet, the "Credit card" row becomes **Card** ("Credit or debit, by card type and bank").
- A debit card's short name is "<bank> debit" when that fits in 12 characters, otherwise the bank name (cut to 12). This also fixes the M4 backlog item about long short names, in both sheets.
- No card number, CVV or expiry anywhere (unchanged).
