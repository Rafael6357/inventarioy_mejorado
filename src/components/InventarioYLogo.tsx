import React from 'react';

interface InventarioYProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'text' | 'image';
}

export default function InventarioY({ className = '', size = 'md', variant = 'text' }: InventarioYProps) {
  const sizeClasses = {
    sm: { text: 'text-lg', image: 'w-6 h-6' },
    md: { text: 'text-xl', image: 'w-8 h-8' },
    lg: { text: 'text-2xl', image: 'w-10 h-10' },
    xl: { text: 'text-3xl', image: 'w-12 h-12' },
  };

  if (variant === 'image') {
    return (
      <img
        src="/logo.svg"
        alt="InventarioY"
        loading="lazy"
        className={`${sizeClasses[size].image} ${className}`}
      />
    );
  }

  return (
    <span className={`font-bold inline ${sizeClasses[size].text} ${className}`}>
      <span className="text-primary drop-shadow-[0_0_8px_rgba(255,193,7,0.8)]">Inventario</span>
      <span className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]">Y</span>
    </span>
  );
}
