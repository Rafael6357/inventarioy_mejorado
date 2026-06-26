import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useReducedMotion } from './useReducedMotion';

export function useModalAnimation(isOpen: boolean) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!isOpen) return;

    const backdrop = backdropRef.current;
    const card = cardRef.current;
    if (!backdrop || !card) return;

    if (reduced) {
      backdrop.style.opacity = '1';
      card.style.opacity = '1';
      card.style.transform = 'none';
      return;
    }

    const tl = gsap.timeline();
    tl.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' });
    tl.fromTo(card, { opacity: 0, scale: 0.88, y: 20 }, { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: 'back.out(1.7)' }, '-=0.1');

    return () => { tl.kill(); };
  }, [isOpen, reduced]);

  return { backdropRef, cardRef };
}
