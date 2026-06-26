import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useReducedMotion } from './useReducedMotion';

export function useCountUp(value: number, duration = 0.8, decimals = 0) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (reduced) {
      el.textContent = decimals > 0
        ? Number(value).toFixed(decimals)
        : Math.round(value).toLocaleString('es-CO');
      return;
    }

    const obj = { val: 0 };
    const tl = gsap.to(obj, {
      val: value,
      duration,
      ease: 'expo.out',
      onUpdate: () => {
        el.textContent = decimals > 0
          ? obj.val.toFixed(decimals)
          : Math.round(obj.val).toLocaleString('es-CO');
      },
    });

    return () => { tl.kill(); };
  }, [value, duration, decimals, reduced]);

  return ref;
}
