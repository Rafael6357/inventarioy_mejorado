export interface PayrollResult {
  vacationBase: number;
  taxableBase: number;
  taxAmount: number;
  specialContribution: number;
  employerContribution: number;
  netSalary: number;
}

const ROUND = (v: number) => Math.round(v * 100) / 100;

const IIP_BRACKETS = [
  { min: 0, max: 3260, rate: 0 },
  { min: 3260, max: 4500, rate: 0.03 },
  { min: 4500, max: 7000, rate: 0.05 },
  { min: 7000, max: 10000, rate: 0.10 },
  { min: 10000, max: 15000, rate: 0.15 },
  { min: 15000, max: 20000, rate: 0.20 },
  { min: 20000, max: Infinity, rate: 0.30 },
];

export function calcularNomina(
  salarioDevengado: number,
  exemptionBase: number = 3260,
): PayrollResult {
  const vacationBase = ROUND(salarioDevengado * 1.0909);

  const baseIIP = Math.max(0, vacationBase - exemptionBase);

  let taxAmount = 0;
  for (const b of IIP_BRACKETS) {
    if (baseIIP > b.min) {
      const taxableInBracket = Math.min(baseIIP, b.max) - b.min;
      taxAmount += taxableInBracket * b.rate;
    }
  }
  taxAmount = ROUND(taxAmount);

  let specialContribution: number;
  if (salarioDevengado <= 15000) {
    specialContribution = ROUND(vacationBase * 0.05);
  } else {
    specialContribution = ROUND(15000 * 0.05 + (vacationBase - 15000) * 0.10);
  }

  const employerContribution = ROUND(vacationBase * 0.14);

  const netSalary = ROUND(salarioDevengado - taxAmount - specialContribution);

  return {
    vacationBase,
    taxableBase: baseIIP,
    taxAmount,
    specialContribution,
    employerContribution,
    netSalary,
  };
}
