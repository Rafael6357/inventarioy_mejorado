export function formatNumber(value: number | null | undefined, maxDecimals: number = 4): string {
  if (value === null || value === undefined || isNaN(value)) return '0';
  const fixed = value.toFixed(maxDecimals);
  return fixed.replace(/\.?0+$/, '').replace('.', ',');
}

export type DisplayUnit = string | null | undefined;

function isIntegerUnit(unit: DisplayUnit): boolean {
  if (!unit) return true;
  const u = String(unit).toLowerCase().trim();
  if (u === 'u' || u === 'und' || u === 'unidad' || u === 'unidades' || u === 'pz' || u === 'pza' || u === 'pzas' || u === 'pieza' || u === 'piezas') {
    return true;
  }
  return false;
}

export function formatQuantity(value: number | null | undefined, unit?: DisplayUnit, fallbackDecimals: number = 3): string {
  if (value === null || value === undefined || isNaN(value)) return '0';
  if (isIntegerUnit(unit)) {
    return Math.round(value).toString();
  }
  return value.toFixed(fallbackDecimals);
}
