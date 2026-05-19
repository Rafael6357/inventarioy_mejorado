import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseNumber(value: string): string {
  if (value === '') return '';
  const num = Number(value);
  return isNaN(num) ? '' : String(num);
}

export function getNumberFromString(value: string | number): number {
  if (value === '' || value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : (isNaN(Number(value)) ? 0 : Number(value));
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateNumber(
  value: string,
  options?: {
    required?: boolean;
    min?: number;
    max?: number;
    fieldName?: string;
  }
): ValidationResult {
  const { required = false, min, max, fieldName = 'Campo' } = options || {};
  
  if (required && (value === '' || value === null || value === undefined)) {
    return { isValid: false, error: `${fieldName} es requerido` };
  }
  
  if (value === '' || value === null || value === undefined) {
    return { isValid: true };
  }
  
  const numValue = Number(value);
  
  if (isNaN(numValue)) {
    return { isValid: false, error: `${fieldName} debe ser un número válido` };
  }
  
  if (min !== undefined && numValue < min) {
    return { isValid: false, error: `${fieldName} debe ser mayor o igual a ${min}` };
  }
  
  if (max !== undefined && numValue > max) {
    return { isValid: false, error: `${fieldName} debe ser menor o igual a ${max}` };
  }
  
  return { isValid: true };
}