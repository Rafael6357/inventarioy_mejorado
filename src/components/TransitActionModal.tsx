import { AlertTriangle, X, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { NumberInput } from './ui/NumberInput';
import {
  convertUnit, getCompatibleUnits, saveLastUsedUnit, normalizeUnit,
  UNIT_LABELS, type UnitAbbrev,
} from '../lib/unitConversion';

export type TransitActionType = 'cancel' | 'waste' | 'consumption';

interface TransitItem {
  id: string;
  product_id: string;
  remaining: number;
}

interface TransitActionModalProps {
  type: TransitActionType;
  item: TransitItem;
  productName: string;
  productUnit: string;
  quantity: number;
  unit: UnitAbbrev;
  reason: string;
  isProcessing: boolean;
  icon: React.ReactNode;
  title: string;
  iconBgColor: string;
  onQuantityChange: (qty: number) => void;
  onUnitChange: (unit: UnitAbbrev) => void;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  showReason?: boolean;
  reasonPlaceholder?: string;
  reasonRequired?: boolean;
}

export default function TransitActionModal({
  type,
  item,
  productName,
  productUnit,
  quantity,
  unit,
  reason,
  isProcessing,
  icon,
  title,
  iconBgColor,
  onQuantityChange,
  onUnitChange,
  onReasonChange,
  onConfirm,
  onCancel: handleCancel,
  confirmLabel,
  showReason = true,
  reasonPlaceholder = 'Describa el motivo...',
  reasonRequired = true,
}: TransitActionModalProps) {
  const baseUnit = normalizeUnit(productUnit);
  const compatibleUnits = getCompatibleUnits(baseUnit);
  const currentQuantityInBase = convertUnit(quantity, unit, baseUnit);
  const maxInCurrentUnit = convertUnit(item.remaining, baseUnit, unit);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm modal-backdrop">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl max-h-[90dvh] overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBgColor}`}>
              {icon}
            </div>
            <div>
              <h2 className="text-lg font-bold text-text">{title}</h2>
              <p className="text-xs text-text-secondary">{productName}</p>
            </div>
          </div>
          <button onClick={handleCancel} className="rounded-full p-2 text-text-secondary hover:bg-surface-hover hover:text-text transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 space-y-4">
          <div className="rounded-xl bg-bg/50 border border-border p-4">
            <div className="flex items-center gap-2 mb-3 text-sm text-text-secondary">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Disponible: <span className="font-bold text-text">{item.remaining} {baseUnit}</span>
            </div>

            <div className="flex gap-2 mb-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-text-secondary">Cantidad *</label>
                <NumberInput
                  min={0.0001}
                  max={maxInCurrentUnit}
                  step="0.01"
                  value={quantity}
                  onValueChange={onQuantityChange}
                />
              </div>
              <div className="w-32">
                <label className="text-xs font-medium text-text-secondary">Unidad</label>
                <select
                  value={unit}
                  onChange={(e) => {
                    const newUnit = e.target.value as UnitAbbrev;
                    const convertedQty = convertUnit(quantity, unit, newUnit);
                    onUnitChange(newUnit);
                    onQuantityChange(convertedQty);
                    saveLastUsedUnit(item.product_id, newUnit);
                  }}
                  disabled={compatibleUnits.length <= 1}
                  className="w-full rounded-lg border border-border bg-bg px-2 py-2 text-sm text-text disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {compatibleUnits.map((u) => (
                    <option key={u} value={u}>{UNIT_LABELS[u]}</option>
                  ))}
                </select>
              </div>
            </div>

            {currentQuantityInBase > item.remaining && (
              <p className="text-xs text-danger mt-2">
                La cantidad excede el disponible ({item.remaining} {baseUnit})
              </p>
            )}

            <div className="flex gap-2 mt-2">
              {[0.25, 0.5, 1].map((pct, i) => {
                const qtyInUnit = convertUnit(item.remaining * pct, baseUnit, unit);
                return (
                  <button
                    key={pct}
                    onClick={() => onQuantityChange(qtyInUnit)}
                    className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text-secondary hover:border-primary hover:text-primary transition-colors"
                  >
                    {i === 2 ? '100%' : `${i === 0 ? 25 : 50}%`}
                  </button>
                );
              })}
            </div>
          </div>

          {showReason && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">
                {type === 'consumption' ? 'Nota' : 'Motivo'}{reasonRequired ? ' *' : ''}
              </label>
              <textarea
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                rows={2}
                placeholder={reasonPlaceholder}
                value={reason}
                onChange={(e) => onReasonChange(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleCancel} className="flex-1" disabled={isProcessing}>
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 gap-2"
            disabled={isProcessing || (reasonRequired && !reason.trim()) || currentQuantityInBase > item.remaining || currentQuantityInBase <= 0}
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
            {confirmLabel || title}
          </Button>
        </div>
      </div>
    </div>
  );
}