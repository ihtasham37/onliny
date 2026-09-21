import React from 'react';

// FIX: Added 'as' prop to allow rendering as a different element (e.g., span)
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  as?: 'button' | 'span';
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', className = '', as: Component = 'button', ...props }) => {
  const baseClasses = 'font-bold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-rose-600 via-rose-700 to-amber-600 text-white hover:from-rose-700 hover:to-amber-700 focus:ring-rose-400 shadow-xs active:scale-[0.99]',
    secondary: 'bg-rose-50 text-rose-900 hover:bg-rose-100 focus:ring-rose-300 border border-rose-100',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
    ghost: 'bg-transparent text-slate-700 hover:bg-rose-50 hover:text-rose-700 focus:ring-rose-300',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500',
    outline: 'bg-transparent border border-rose-300 text-rose-700 hover:bg-rose-50 focus:ring-rose-400',
  };

  const sizeClasses = {
    xs: 'py-0.5 px-1.5 text-xs',
    sm: 'py-1 px-2 text-sm',
    md: 'py-2 px-4 text-base',
    lg: 'py-3 px-6 text-lg',
  };

  return (
    <Component
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
};