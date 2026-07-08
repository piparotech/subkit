export function sumCurrency(values: readonly string[]): string {
  const total = values.reduce((sum, value) => sum + Number(value.replace(/[^0-9.-]/g, '')), 0)
  return new Intl.NumberFormat('en-US', {
    currency: 'USD',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(total)
}

export function sumNumberText(values: readonly string[]): string {
  const total = values.reduce((sum, value) => sum + Number(value.replace(/[^0-9.-]/g, '')), 0)
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(total)
}
