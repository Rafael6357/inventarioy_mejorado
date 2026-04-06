const UNIT_CONVERSIONS = {
  weight: {
    g: 1,
    kg: 1000,
    lb: 453.592,
    oz: 28.3495,
    u: 1,
  },
  volume: {
    ml: 1,
    L: 1000,
    gal: 3785.41,
    'fl oz': 29.5735,
    u: 1,
  },
};

export type UnitType = 'weight' | 'volume';
export type UnitAbbrev = 'g' | 'kg' | 'lb' | 'oz' | 'u' | 'ml' | 'L' | 'gal' | 'fl oz';

export const UNIT_LABELS: Record<UnitAbbrev, string> = {
  g: 'Gramos (g)',
  kg: 'Kilogramos (kg)',
  lb: 'Libras (lb)',
  oz: 'Onzas (oz)',
  u: 'Unidades (u)',
  ml: 'Mililitros (ml)',
  L: 'Litros (L)',
  gal: 'Galones (gal)',
  'fl oz': 'Onzas líquidas (fl oz)',
};

export const UNITS_BY_TYPE: Record<UnitType, UnitAbbrev[]> = {
  weight: ['g', 'kg', 'lb', 'oz', 'u'],
  volume: ['ml', 'L', 'gal', 'fl oz', 'u'],
};

const UNIT_ALIASES: Record<string, UnitAbbrev> = {
  'u': 'u', 'unidades': 'u', 'unidad': 'u', 'un': 'u', 'unds': 'u',
  'g': 'g', 'gramos': 'g', 'gramo': 'g', 'gr': 'g',
  'kg': 'kg', 'kilogramos': 'kg', 'kilogramo': 'kg', 'kilos': 'kg', 'kgs': 'kg',
  'lb': 'lb', 'libras': 'lb', 'libra': 'lb', 'lbs': 'lb',
  'oz': 'oz', 'onzas': 'oz', 'onza': 'oz',
  'ml': 'ml', 'mililitros': 'ml', 'mililitro': 'ml',
  'l': 'L', 'litros': 'L', 'litro': 'L', 'lts': 'L',
  'gal': 'gal', 'galones': 'gal', 'galon': 'gal',
  'fl oz': 'fl oz', 'onzas liquidas': 'fl oz', 'ozfl': 'fl oz',
};

export function normalizeUnit(unit: string): UnitAbbrev {
  if (!unit) return 'u';
  const normalized = unit.toLowerCase().trim();
  return UNIT_ALIASES[normalized] || 'u';
}

export function getUnitType(unit: UnitAbbrev): UnitType | null {
  if (['g', 'kg', 'lb', 'oz'].includes(unit)) return 'weight';
  if (['ml', 'L', 'gal', 'fl oz'].includes(unit)) return 'volume';
  return null;
}

export function getCompatibleUnits(baseUnit: UnitAbbrev): UnitAbbrev[] {
  if (baseUnit === 'u') return ['u'];
  const type = getUnitType(baseUnit);
  if (!type) return [baseUnit];
  return UNITS_BY_TYPE[type];
}

export function convertUnit(
  value: number,
  fromUnit: UnitAbbrev,
  toUnit: UnitAbbrev,
  precision: number = 4
): number {
  if (fromUnit === toUnit) return Number(value.toFixed(precision));

  const fromType = getUnitType(fromUnit);
  const toType = getUnitType(toUnit);

  if (fromType !== toType) {
    throw new Error(`No se puede convertir de ${fromUnit} a ${toUnit}: unidades incompatibles`);
  }

  const baseValue = value * UNIT_CONVERSIONS[fromType!][fromUnit];
  const convertedValue = baseValue / UNIT_CONVERSIONS[fromType!][toUnit];

  return Number(convertedValue.toFixed(precision));
}

export function getLastUsedUnit(productId: string): UnitAbbrev | null {
  try {
    const stored = localStorage.getItem('inventarioy_unit_preferences');
    if (!stored) return null;
    const prefs = JSON.parse(stored);
    return prefs[productId]?.lastUnit || null;
  } catch {
    return null;
  }
}

export function saveLastUsedUnit(productId: string, unit: UnitAbbrev): void {
  try {
    const stored = localStorage.getItem('inventarioy_unit_preferences');
    const prefs = stored ? JSON.parse(stored) : {};
    prefs[productId] = {
      lastUnit: unit,
      lastUsed: Date.now(),
    };
    localStorage.setItem('inventarioy_unit_preferences', JSON.stringify(prefs));
  } catch {
    // Silently fail if localStorage is not available
  }
}

export function getDisplayValue(value: number, unit: UnitAbbrev): string {
  if (value >= 1000) {
    return value.toFixed(2);
  }
  if (value < 1) {
    return value.toFixed(4);
  }
  return value.toFixed(2);
}
