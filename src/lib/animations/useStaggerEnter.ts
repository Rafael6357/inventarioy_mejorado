import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useReducedMotion } from './useReducedMotion';

export function useStaggerEnter<T extends HTMLElement = HTMLDivElement>(deps: any[] = []) {
  const ref = useRef<T>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;

    const el = ref.current;
    if (!el) return;

    const children = Array.from(el.children).filter(
      (c) => c instanceof HTMLElement && !c.classList.contains('skip-animation')
    ) as HTMLElement[];

    if (children.length === 0) return;

    const tl = gsap.timeline();
    tl.fromTo(
      children,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.35, stagger: 0.06, ease: 'power2.out' }
    );

    return () => { tl.kill(); };
  }, [...deps, reduced]);

  return ref;
}
