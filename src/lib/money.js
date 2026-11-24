// Amounts are stored as integer centavos; format only for display.
const fmt = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })
export const peso = (centavos = 0) => fmt.format(centavos / 100)
