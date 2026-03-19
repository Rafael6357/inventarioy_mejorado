import React from 'react';

interface InventarioYProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function InventarioY({ className = '', size = 'md' }: InventarioYProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  return (
    <span className={`font-bold text-gradient hero-glow inline ${sizeClasses[size]} ${className}`}>
      <span className="text-primary drop-shadow-[0_0_8px_rgba(255,193,7,0.5)]">Inventario</span>
      <span className="drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">Y</span>
    </span>
  );
}
