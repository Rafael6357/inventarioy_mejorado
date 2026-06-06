import * as React from "react";
import { Input, type InputProps } from "./input";
import { cn } from "./button";

export interface NumberInputProps
  extends Omit<InputProps, "value" | "onChange" | "type"> {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: string | number;
  allowEmpty?: boolean;
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onValueChange, min, max, step, allowEmpty = true, className, onWheel, ...props }, ref) => {
    const [display, setDisplay] = React.useState<string>(() => {
      if (value === 0 || value === null || value === undefined) return "";
      return String(value);
    });
    const isFocusedRef = React.useRef(false);

    React.useEffect(() => {
      if (!isFocusedRef.current) {
        if (value === 0 || value === null || value === undefined || Number.isNaN(value)) {
          setDisplay("");
        } else {
          setDisplay(String(value));
        }
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setDisplay(raw);

      if (raw === "" || raw === "-") {
        if (allowEmpty) {
          onValueChange(0);
        }
        return;
      }

      const parsed = Number(raw);
      if (Number.isNaN(parsed)) {
        return;
      }

      let clamped = parsed;
      if (min !== undefined && clamped < min) clamped = min;
      if (max !== undefined && clamped > max) clamped = max;
      onValueChange(clamped);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      isFocusedRef.current = true;
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      isFocusedRef.current = false;
      if (display === "" && !allowEmpty && min !== undefined) {
        setDisplay(String(min));
        onValueChange(min);
      } else if (value === 0 && allowEmpty) {
        setDisplay("");
      } else {
        setDisplay(String(value));
      }
      props.onBlur?.(e);
    };

    const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
      (e.target as HTMLInputElement).blur();
      onWheel?.(e);
    };

    return (
      <Input
        ref={ref}
        type="number"
        inputMode="decimal"
        value={display}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onWheel={handleWheel}
        step={step ?? "any"}
        className={cn("no-spin", className)}
        {...props}
      />
    );
  }
);
NumberInput.displayName = "NumberInput";

export { NumberInput };
