import * as React from 'react';
import { cn } from '../../lib/utils';

export interface SwitchProps extends Omit<React.HTMLAttributes<HTMLButtonElement>, 'type'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = ({ className, checked, onCheckedChange, onClick, ...props }: SwitchProps) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onCheckedChange) {
      onCheckedChange(!checked);
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={handleClick}
      className={cn(
        'peer inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-border',
        className
      )}
      {...props}
    >
      <span
        className={cn(
          'pointer-events-none block h-6 w-6 rounded-full bg-white shadow-lg ring-0 transition-transform',
          checked ? 'translate-x-8' : 'translate-x-0'
        )}
      />
    </button>
  );
};

Switch.displayName = 'Switch';

export { Switch };