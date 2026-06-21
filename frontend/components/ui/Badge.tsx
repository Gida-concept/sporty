import { type ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'sports' | 'entertainment' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: 'bg-gray-100 text-gray-700',
  sports: 'bg-green-100 text-green-800',
  entertainment: 'bg-purple-100 text-purple-800',
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
};

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${variantStyles[variant]} ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'} ${className}`}
    >
      {children}
    </span>
  );
}
