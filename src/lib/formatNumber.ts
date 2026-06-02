export function formatNumber(value: number | null | undefined, maxDecimals: number = 4): string {
  if (value === null || value === undefined || isNaN(value)) return '0';
  const fixed = value.toFixed(maxDecimals);
  return fixed.replace(/\.?0+$/, '').replace('.', ',');
}
